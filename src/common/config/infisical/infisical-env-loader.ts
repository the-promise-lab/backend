import { InfisicalSDK } from '@infisical/sdk';

type InfisicalEnvName = 'dev' | 'prod';

type InfisicalAuthConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly projectId: string;
  readonly environment: InfisicalEnvName;
  readonly siteUrl?: string;
};

type InfisicalServiceTokenConfig = {
  readonly serviceToken: string;
  readonly projectId: string;
  readonly environment: InfisicalEnvName;
  readonly siteUrl?: string;
};

type InfisicalSecret = {
  readonly secretKey: string;
  readonly secretValue: string;
};

type LoadResult = {
  readonly loadedKeys: readonly string[];
  readonly skippedKeys: readonly string[];
};

type SecretsListResponse = { readonly secrets: readonly InfisicalSecret[] };

/**
 * Loads secrets from Infisical (Universal Auth) and injects them into process.env.
 *
 * - Existing keys in process.env are NOT overwritten (local override wins).
 * - Intended to run before NestJS bootstrap.
 */
export class InfisicalEnvLoader {
  public async loadAndInject(params: InfisicalAuthConfig): Promise<LoadResult> {
    const sdk: InfisicalSDK = new InfisicalSDK({
      siteUrl: params.siteUrl,
    });
    const authenticatedSdk: InfisicalSDK = await sdk
      .auth()
      .universalAuth.login({
        clientId: params.clientId,
        clientSecret: params.clientSecret,
      });
    const response: SecretsListResponse = await authenticatedSdk
      .secrets()
      .listSecrets({
        projectId: params.projectId,
        environment: params.environment,
        viewSecretValue: true,
      });
    const secrets: readonly InfisicalSecret[] = this.parseSecrets(response);
    return this.injectSecrets(secrets);
  }

  public async loadAndInjectWithServiceToken(
    params: InfisicalServiceTokenConfig,
  ): Promise<LoadResult> {
    const sdk: InfisicalSDK = new InfisicalSDK({
      siteUrl: params.siteUrl,
    });
    const authenticatedSdk: InfisicalSDK = sdk
      .auth()
      .accessToken(params.serviceToken);
    const response: SecretsListResponse = await authenticatedSdk
      .secrets()
      .listSecrets({
        projectId: params.projectId,
        environment: params.environment,
        viewSecretValue: true,
      });
    const secrets: readonly InfisicalSecret[] = this.parseSecrets(response);
    return this.injectSecrets(secrets);
  }

  private injectSecrets(secrets: readonly InfisicalSecret[]): LoadResult {
    const loadedKeys: string[] = [];
    const skippedKeys: string[] = [];
    for (const secret of secrets) {
      const key: string = secret.secretKey;
      const value: string = secret.secretValue;
      if (!key) {
        continue;
      }
      if (typeof process.env[key] === 'string' && process.env[key]?.length) {
        skippedKeys.push(key);
        continue;
      }
      process.env[key] = value;
      loadedKeys.push(key);
    }
    return { loadedKeys, skippedKeys };
  }

  private parseSecrets(
    response: SecretsListResponse,
  ): readonly InfisicalSecret[] {
    return response.secrets;
  }
}
