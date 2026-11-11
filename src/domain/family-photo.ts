export function validFamilyPhoto(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 44000 &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}
