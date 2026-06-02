// Augments NodeJS.ProcessEnv to type our NEXT_PUBLIC_* env vars.
// Merges with @types/node when installed; standalone ambient declaration otherwise.
namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_API_URL?: string;
  }
}
