import { expect } from '@playwright/test'
import type { GclScope } from '../../fixtures/lookup'

// Compatibility exports keep existing page objects and tests on the same API.
export { GclLookup } from '../../fixtures/lookup'
export type { GclScope, GclSelection } from '../../fixtures/lookup'

export async function enterGclDeparture(scope: GclScope, expected: string) {
  const field = scope.locator('[name="ins_departureDate"]');
  await field.focus();
  await field.press("ControlOrMeta+A");
  await field.press("Backspace");
  await field.pressSequentially(expected, { delay: 25 });
  await field.press("Tab");
  await expect(
    field,
    "Departure Date stays valid after leaving the masked input",
  ).toHaveValue(expected);
  return expected;
}

/** Real key events keep the legacy mask's buffer in sync; fill() alone can be cleared on blur. */
export async function selectGclToday(scope: GclScope) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  const expected = `${part("day")}-${part("month")}-${part("year")}`;
  return enterGclDeparture(scope, expected);
}

export const UPPER_LOOKUPS = [
  "INcompanyCode",
  "containerLoader",
  "vesselName",
  "releasePort",
  "dischargePort",
  "loadPort",
  "packingPort",
  "carProvince_2",
  "carCountryCode",
  "trailerProvinceCode",
  "trailerCountryCode",
] as const;
export const UPPER_OPTIONAL = [
  "voyage",
  "carLicense_2",
  "trailerLicense",
  "carType2",
  "sealNumber1",
  "GPSID",
  "remarkGCL",
  "bookingNumber",
  "authorizer",
] as const;
