import * as vscode from 'vscode';
import { getApiClient } from './api';

export class UnlinkedTimelogsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (element) {
            return []; // No nested elements for now
        }

        const client = getApiClient();
        try {
            const res = await client.get('/commits/unassigned-time');
            const logs: any[] = res.data;

            if (logs.length === 0) {
                return [new vscode.TreeItem('No unlinked timelogs', vscode.TreeItemCollapsibleState.None)];
            }

            return logs.map(log => {
                const item = new vscode.TreeItem(`${log.duration_minutes}m: ${log.task_description}`, vscode.TreeItemCollapsibleState.None);
                item.description = log.repo_name;
                item.contextValue = 'timelog';
                item.iconPath = new vscode.ThemeIcon('circle-outline');
                (item as any).timelogId = log.id;
                return item;
            });
        } catch (e) {
            console.error('Failed to fetch unlinked logs', e);
            return [new vscode.TreeItem('Error fetching logs', vscode.TreeItemCollapsibleState.None)];
        }
    }
}
