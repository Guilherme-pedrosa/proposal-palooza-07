import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>(
      value === 0 ? '' : value.toString().replace('.', ',')
    );

    React.useEffect(() => {
      // Only update display if external value changed and input isn't focused
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
      
      // Only allow numbers and one comma
      const regex = /^[0-9]*,?[0-9]*$/;
      if (!regex.test(input)) {
        return;
      }

      setDisplayValue(input);
      
      // Parse value for onChange
      const numericValue = parseFloat(input.replace(',', '.')) || 0;
      onChange(numericValue);
    };

    const handleBlur = () => {
      // Format on blur if there's a value
      if (displayValue && displayValue !== '') {
        const numericValue = parseFloat(displayValue.replace(',', '.')) || 0;
        if (numericValue > 0) {
          setDisplayValue(numericValue.toFixed(2).replace('.', ','));
        }
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          R$
        </span>
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="0,00"
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
