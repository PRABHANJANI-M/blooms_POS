import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Field({ label, error, hint, children, className, htmlFor }: {
  label?: string; error?: string; hint?: string; children: ReactNode; className?: string; htmlFor?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && <label htmlFor={htmlFor} className="label">{label}</label>}
      {children}
      {error ? <p className="error-text" role="alert">{error}</p> : hint ? <p className="hint-text">{hint}</p> : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: boolean; compact?: boolean; numeric?: boolean }
export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput({ error, compact, numeric, className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn('input', compact && 'input-sm', numeric && 'input-num', error && 'is-error', className)}
      {...rest}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { error?: boolean; compact?: boolean }
export const SelectInput = forwardRef<HTMLSelectElement, SelectProps>(function SelectInput({ error, compact, className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn('select', compact && 'input-sm', error && 'is-error', className)} {...rest}>
      {children}
    </select>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { error?: boolean }
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ error, className, ...rest }, ref) {
  return <textarea ref={ref} className={cn('textarea', error && 'is-error', className)} {...rest} />;
});
