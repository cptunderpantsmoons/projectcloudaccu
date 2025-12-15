import { Provider } from '@nestjs/common';
import { Client } from '@temporalio/client';
import { ConfigService } from '@nestjs/config';

export const TEMPORAL_CLIENT = 'TEMPORAL_CLIENT';

export const TemporalClientProvider: Provider = {
  provide: TEMPORAL_CLIENT,
  useFactory: async (configService: ConfigService): Promise<Client> => {
    return new Client({
      address: configService.get('TEMPORAL_ADDRESS') || 'localhost:7233',
      namespace: configService.get('TEMPORAL_NAMESPACE') || 'default',
      tls: configService.get('TEMPORAL_TLS') ? {
        serverNameOverride: configService.get('TEMPORAL_TLS_SERVER_NAME'),
        rootCA: configService.get('TEMPORAL_TLS_ROOT_CA'),
        clientCert: configService.get('TEMPORAL_TLS_CLIENT_CERT'),
        clientKey: configService.get('TEMPORAL_TLS_CLIENT_KEY'),
      } : undefined,
    });
  },
  inject: [ConfigService],
};