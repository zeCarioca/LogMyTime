import * as vscode from 'vscode';
import { getApiClient } from './api';
import { UnlinkedTimelogsProvider } from './treeProvider';

let statusBarItem: vscode.StatusBarItem;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let currentRepoId: number | null = null;

// Local timer state for smooth updates between polling
let localSeconds = 0;
let localIsRunning = false;
let localTickInterval: ReturnType<typeof setInterval> | null = null;

export async function activate(context: vscode.ExtensionContext) {
    console.log('LogMyTime extension is now active!');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'logmytime.toggleTimer';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const toggleTimerDisposable = vscode.commands.registerCommand('logmytime.toggleTimer', async () => {
        if (localIsRunning) {
            await vscode.commands.executeCommand('logmytime.stopTimer');
        } else {
            await vscode.commands.executeCommand('logmytime.startTimer');
        }
    });

    const startTimerDisposable = vscode.commands.registerCommand('logmytime.startTimer', async () => {
        const client = getApiClient();
        try {
            await inferWorkspaceRepo();
            await client.post('/time/timer/start', { repo_id: currentRepoId });
            vscode.window.showInformationMessage('LogMyTime: Timer started!');
            await syncState();
        } catch (error: any) {
            vscode.window.showErrorMessage(`LogMyTime Error: ${error.message}`);
        }
    });

    const stopTimerDisposable = vscode.commands.registerCommand('logmytime.stopTimer', async () => {
        const client = getApiClient();
        try {
            await client.post('/time/timer/pause', {});
            vscode.window.showInformationMessage('LogMyTime: Timer paused!');
            await syncState();
        } catch (error: any) {
            vscode.window.showErrorMessage(`LogMyTime Error: ${error.message}`);
        }
    });

    context.subscriptions.push(toggleTimerDisposable);
    context.subscriptions.push(startTimerDisposable);
    context.subscriptions.push(stopTimerDisposable);

    const treeProvider = new UnlinkedTimelogsProvider();
    vscode.window.registerTreeDataProvider('logmytime-sidebar', treeProvider);

    const linkDisposable = vscode.commands.registerCommand('logmytime.linkToCurrentCommit', async (item?: any) => {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        const api = gitExtension?.getAPI(1);
        
        if (!api || api.repositories.length === 0) {
            vscode.window.showErrorMessage('No active Git repository found in VS Code.');
            return;
        }
        
        const repo = api.repositories[0];
        const head = repo.state.HEAD;
        
        if (!head || !head.commit) {
            vscode.window.showErrorMessage('No commit found on HEAD.');
            return;
        }
        
        const commitSha = head.commit;
        
        let timelogIds: number[] = [];
        if (item && item.timelogId) {
            timelogIds.push(item.timelogId);
        } else {
            vscode.window.showInformationMessage('Please right-click a timelog in the LogMyTime Sidebar to link it.');
            return;
        }

        try {
            const client = getApiClient();
            await client.post('/commits/bulk-link', {
                timelog_ids: timelogIds,
                commit_sha: commitSha
            });
            vscode.window.showInformationMessage(`Linked log to commit ${commitSha.substring(0, 7)}!`);
            treeProvider.refresh();
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to link: ${e.message}`);
        }
    });

    context.subscriptions.push(linkDisposable);

    // Initial sync
    await inferWorkspaceRepo();
    await syncState();

    // Poll backend every 10 seconds to keep in sync
    syncInterval = setInterval(() => {
        syncState();
        treeProvider.refresh();
    }, 10000);

    // Update UI every second
    localTickInterval = setInterval(() => {
        if (localIsRunning) {
            localSeconds++;
            updateStatusBar();
        }
    }, 1000);
}

export function deactivate() {
    if (syncInterval) clearInterval(syncInterval);
    if (localTickInterval) clearInterval(localTickInterval);
}

async function inferWorkspaceRepo() {
    const client = getApiClient();
    if (!vscode.workspace.name) return;
    try {
        const res = await client.get('/repos/');
        const repos = res.data;
        const workspaceName = vscode.workspace.name.toLowerCase();
        
        const matched = repos.find((r: any) => r.full_name.toLowerCase().endsWith(`/${workspaceName}`));
        if (matched) {
            currentRepoId = matched.id;
        }
    } catch (e) {
        console.error('LogMyTime: Failed to infer repo', e);
    }
}

async function syncState() {
    const client = getApiClient();
    try {
        const res = await client.get('/time/timer/state');
        const state = res.data;
        
        localIsRunning = state.is_running;
        
        if (state.is_running && state.start_time) {
            let startString = state.start_time;
            if (!startString.endsWith('Z')) {
                startString += 'Z';
            }
            const startMs = new Date(startString).getTime();
            const elapsed = Math.floor((Date.now() - startMs) / 1000);
            localSeconds = state.accumulated_seconds + elapsed;
        } else {
            localSeconds = state.accumulated_seconds;
        }
        
        if (state.repo_id) {
            currentRepoId = state.repo_id;
        }

        updateStatusBar();
    } catch (e) {
        console.error('LogMyTime: Failed to sync state', e);
        statusBarItem.text = `$(error) LogMyTime Error`;
    }
}

function updateStatusBar() {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const hrs = Math.floor(localSeconds / 3600);
    const mins = Math.floor((localSeconds % 3600) / 60);
    const secs = localSeconds % 60;
    
    let timeStr = hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
    
    if (localIsRunning) {
        statusBarItem.text = `$(clock) ${timeStr} (Active)`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = `$(watch) ${timeStr} (Paused)`;
        statusBarItem.backgroundColor = undefined;
    }
}
