// Deja el ticket en un archivo fuera del repo para que el agente lo lea como datos.
import { writeFileSync, appendFileSync } from 'node:fs';
import { linear } from './linear-client.mjs';
import { formatTicket } from '../lib/ticket.js';

const { ISSUE_ID, IDENTIFIER, TICKET_FILE, GITHUB_OUTPUT } = process.env;
const { issue } = await linear(`query($id: String!) { issue(id: $id) { title description } }`, { id: ISSUE_ID });
writeFileSync(TICKET_FILE, formatTicket({ identifier: IDENTIFIER, ...issue }));
const title = issue.title.replace(/[\r\n]+/g, ' ').slice(0, 120);
appendFileSync(GITHUB_OUTPUT, `title<<FABRICA_EOF\n${title}\nFABRICA_EOF\n`);
