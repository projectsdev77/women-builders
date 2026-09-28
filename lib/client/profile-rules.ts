// Client-safe re-exports of the profile rules, so the editor shows the same
// completeness numbers the server computes.
export {
  FIELD_LABELS,
  OPTIONS,
  ROLE_LABELS,
  calculateCompleteness,
  missingFields,
  missingRequiredFields,
} from '@/lib/services/profile-fields';
export { COMPLETENESS_THRESHOLD as COMPLETENESS_THRESHOLD_CLIENT } from '@/lib/config';
