declare namespace Cloudflare {
  interface Env {
    AKTA_API_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
