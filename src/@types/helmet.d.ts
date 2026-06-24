import { IncomingMessage, ServerResponse } from "node:http";

declare module "helmet" {
  interface HelmetOptions {
    contentSecurityPolicy?:
      | {
          useDefaults?: boolean;
          directives?: Record<
            string,
            null | Iterable<string | ((req: IncomingMessage, res: ServerResponse) => string)>
          >;
          reportOnly?: boolean;
        }
      | boolean;
    crossOriginEmbedderPolicy?: { policy?: "require-corp" | "credentialless" | "unsafe-none" } | boolean;
    crossOriginOpenerPolicy?: { policy?: "same-origin" | "same-origin-allow-popups" | "unsafe-none" } | boolean;
    crossOriginResourcePolicy?: { policy?: "same-origin" | "same-site" | "cross-origin" } | boolean;
    originAgentCluster?: boolean;
    referrerPolicy?: { policy?: string | string[] } | boolean;
    strictTransportSecurity?: { maxAge?: number; includeSubDomains?: boolean; preload?: boolean } | boolean;
    xContentTypeOptions?: boolean;
    xDnsPrefetchControl?: { allow?: boolean } | boolean;
    xDownloadOptions?: boolean;
    xFrameOptions?: { action?: "deny" | "sameorigin" } | boolean;
    xPermittedCrossDomainPolicies?: { permittedPolicies?: "none" | "master-only" | "by-content-type" | "all" } | boolean;
    xPoweredBy?: boolean;
    xXssProtection?: boolean;
  }

  interface Helmet {
    (options?: Readonly<HelmetOptions>): (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void;
  }

  declare const helmet: Helmet;
  export default helmet;
}
