import * as fs from 'fs-extra';
import path from 'path';
import { Session } from '../config/types';
import { config } from '../config/config';

export class SessionManager {
  private sessionsPath = path.join(process.cwd(), config.SESSIONS_FILE);

  async saveSession(session: Session): Promise<void> {
    let sessions: Session[] = [];

    if (await fs.pathExists(this.sessionsPath)) {
      sessions = await fs.readJSON(this.sessionsPath);
    } else [];

    sessions.unshift(session);
    sessions = sessions.slice(0, config.MAX_SESSIONS);

    await fs.writeJSON(this.sessionsPath, sessions, { spaces: 2 });
  }

  async loadSessions(): Promise<Session[]> {
    if (await fs.pathExists(this.sessionsPath)) {
      return await fs.readJSON(this.sessionsPath);
    }
    return [];
  }
}
