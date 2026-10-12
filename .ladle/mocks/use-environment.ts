// Import the mock directly: mocks bypass the redirect so they can wrap real modules.
import { getAppConfig } from "./environment";

export function useEnvironment() {
  return getAppConfig();
}
