import * as React from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, allowDecimals = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>(
      value === 0 ? '' : value.toString().replace('.', ',')
    );

    React.useEffect(() => {
      const numericDisplay = displayValue.replace(',', '.');
      const parsedDisplay = parseFloat(numericDisplay) || 0;
      if (parsedDisplay !== value) {
        setDisplayValue(value === 0 ? '' : value.toString().replace('.', ','));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value;
      
      // Allow empty string
      if (input === '') {
        setDisplayValue('');
        onChange(0);
        return;
      }

      // Replace dot with comma for Brazilian format
      input = input.replace('.', ',');
      
      // Only allow numbers and optionally one comma
      const regex = allowDecimals ? /^[0-9]*,?[0-9]*$/ : /^[0-9]*$/;
      if (!regex.test(input)) {
        return;
      }

      setDisplayValue(input);
      
      // Parse value for onChange
      const numericValue = parseFloat(input.replace(',', '.')) || 0;
      onChange(numericValue);
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder="0"
        {...props}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
