import { Field } from "./ui";
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field
      label={label}
      value={value}
      placeholder="DD/MM/AAAA"
      maxLength={10}
      keyboardType="number-pad"
      onChangeText={(value) => {
        const digits = value.replace(/\D/g, "").slice(0, 8);
        onChange(
          [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
            .filter(Boolean)
            .join("/"),
        );
      }}
    />
  );
}
