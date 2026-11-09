import { createFacilityHandler, type FacilityEnv } from "../../../server/facilities";

const handle = createFacilityHandler();
export function onRequest(context: { request: Request; env: FacilityEnv }) {
  return handle(context.request, context.env);
}
