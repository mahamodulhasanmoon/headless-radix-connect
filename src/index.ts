import { ConnectorClient, NodeWebRTC, NodeWebSocket, createLogger } from '@radixdlt/radix-connect-webrtc';
import 'dotenv/config'
import {config } from './config';
import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import { filter, tap, first } from 'rxjs/operators';
import crypto from 'crypto';
import fs from 'fs';
import path, { dirname, resolve } from 'path';

const __filename = resolve();
const __dirname = dirname(__filename);

const logger = createLogger(1);

const app = express();
const port = 3000;

const getConnectionPasswordFromFile = () => {
  try {
    return fs.readFileSync(path.join(__dirname, 'connection-password.txt'), {
      encoding: 'utf8',
    });
  } catch (error) {
    console.error('Error reading connection password file:', error);
    return null;
  }
};

app.get('/', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Transfer-Encoding', 'chunked');

    const connectorClient = ConnectorClient({
      isInitiator: true,
      target: 'wallet',
      source: 'extension',
      dependencies: { WebRTC: NodeWebRTC(), WebSocket: NodeWebSocket() },
      logger,
    });

    connectorClient.setConnectionConfig(config.connectorClient);

    connectorClient.connect();

    const connectionPassword = getConnectionPasswordFromFile();

    if (!connectionPassword) {
      const pgn = await connectorClient.generateConnectionPassword();
      const password =( pgn as any).value
      const qrCodeData = await QRCode.toDataURL(password.toString('hex'));

      res.write(`<img src="${qrCodeData}" />`);
console.log('password',password);

      fs.writeFileSync('connection-password.txt', password.toString('hex'), {
        encoding: 'utf8',
      });

      const connectionResult = await connectorClient.generateConnectionPassword();
      if (connectionResult.isOk()) {
        const password = connectionResult.value;
        await connectorClient.setConnectionPassword(password);
      } else {
        // Handle the error when generating the connection password
        console.error('Error generating connection password:', connectionResult.error);
      }
      
    } else {
      connectorClient.setConnectionPassword(Buffer.from(connectionPassword, 'hex'));
    }

    res.write('waiting for wallet connection... <br/>');

    await connectorClient.connected$
      .pipe(
        filter((status) => status),
        tap(() => {
          connectorClient.sendMessage({
            interactionId: crypto.randomUUID(),
            metadata: {
              version: 2,
              networkId: 2,
              dAppDefinitionAddress:
                'account_tdx_2_12yf9gd53yfep7a669fv2t3wm7nz9zeezwd04n02a433ker8vza6rhe',
              origin: 'http://localhost:3000',
            },
            items: {
              discriminator: 'authorizedRequest',
              auth: {
                discriminator: 'loginWithoutChallenge',
              },
              ongoingAccounts: {
                numberOfAccounts: {
                  quantifier: 'atLeast',
                  quantity: 1,
                },
              },
            },
          });
        }),
        first()
      )
      .toPromise();

    res.end('success');
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Dev server running on http://localhost:${port}`);
});
