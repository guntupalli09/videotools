import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, description, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <motion.div
          whileTap={{ scale: 0.95 }}
          className={`w-5 h-5 rounded border-2 transition-all ${
            checked
              ? 'bg-purple-600 border-purple-600'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-purple-400'
          }`}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          )}
        </motion.div>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900 dark:text-white block">
          {label}
        </span>
        {description && (
          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}

interface RadioGroupProps {
  label: string;
  options: Array<{ value: string; label: string; description?: string }>;
  value: string;
  onChange: (value: string) => void;
}

export function RadioGroup({ label, options, value, onChange }: RadioGroupProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-900 dark:text-white block">
        {label}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <motion.label
            key={option.value}
            whileHover={{ x: 2 }}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              value === option.value
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
            }`}
          >
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <div className="relative flex-shrink-0 mt-0.5">
              <div
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value
                    ? 'border-purple-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {value === option.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="absolute inset-1 bg-purple-600 rounded-full"
                  />
                )}
              </div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white block">
                {option.label}
              </span>
              {option.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                  {option.description}
                </span>
              )}
            </div>
          </motion.label>
        ))}
      </div>
    </div>
  );
}

interface SelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}

export function Select({ label, options, value, onChange }: SelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-900 dark:text-white block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}

export function Input({ label, placeholder, value, onChange, multiline = false }: InputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-900 dark:text-white block">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />
      )}
    </div>
  );
}

interface ExportFormatProps {
  formats: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  selected: string[];
  onChange: (formats: string[]) => void;
}

export function ExportFormat({ formats, selected, onChange }: ExportFormatProps) {
  const toggleFormat = (format: string) => {
    if (selected.includes(format)) {
      onChange(selected.filter((f) => f !== format));
    } else {
      onChange([...selected, format]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-900 dark:text-white block">
        Export Format
      </label>
      <div className="flex flex-wrap gap-2">
        {formats.map((format) => (
          <motion.button
            key={format.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleFormat(format.value)}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              selected.includes(format.value)
                ? 'border-purple-500 bg-purple-500 text-white'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-300'
            }`}
          >
            {format.icon && <span className="mr-1">{format.icon}</span>}
            {format.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
