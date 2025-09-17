import * as React from "react";
import styles from "./ToggleSwitch.module.css";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
};

const ToggleSwitch: React.FC<Props> = ({
  checked,
  onChange,
  disabled,
  id,
}) => {
  const toggle = () => !disabled && onChange(!checked);

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
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
      <span className={styles.thumb} />
    </button>
  );
};

export default ToggleSwitch;
