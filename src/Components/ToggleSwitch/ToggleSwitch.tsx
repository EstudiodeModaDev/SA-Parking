import React from "react";
import styles from "./ToggleSwitch.module.css";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  /** Texto opcional; por defecto ON/OFF */
  onLabel?: string;
  offLabel?: string;
};

const ToggleSwitch: React.FC<Props> = ({
  checked,
  onChange,
  disabled,
  id,
  onLabel ,
  offLabel ,
}) => {
  const toggle = () => !disabled && onChange(!checked);

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? onLabel : offLabel}
      disabled={disabled}
      className={`${styles.switch} ${checked ? styles.on : ""} ${disabled ? styles.disabled : ""}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <span className={styles.trackText}>{checked ? onLabel : offLabel}</span>
      <span className={styles.thumb} />
    </button>
  );
};

export default ToggleSwitch;
