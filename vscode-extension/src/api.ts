import axios from 'axios';
import * as vscode from 'vscode';

export function getApiClient() {
    const config = vscode.workspace.getConfiguration('logmytime');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:8000');
    const apiToken = config.get<string>('apiToken', '');

    return axios.create({
        baseURL: apiUrl,
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        }
    });
}
