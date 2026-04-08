import { forwardRef, type ButtonHTMLAttributes } from "react";
import styles from "./PremiumButton.module.css";

type PremiumButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
};

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  function PremiumButton(
    { className = "", variant = "primary", fullWidth = false, type = "button", ...props },
    ref
  ) {
    const classes = [
      styles.button,
      variant === "primary" ? styles.primary : styles.ghost,
      fullWidth ? styles.fullWidth : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        {...props}
      />
    );
  }
);
