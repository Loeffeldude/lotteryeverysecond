interface BallProps {
  value: number;
  type?: "normal" | "star" | "power";
  isMatch?: boolean;
  editable?: boolean;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
}

function Ball({ 
  value, 
  type = "normal", 
  isMatch = false, 
  editable = false,
  onChange,
  min = 1,
  max = 50
}: BallProps) {
  const className = `ball ${type === "star" ? "star" : ""} ${type === "power" ? "power" : ""} ${isMatch ? "match" : ""} ${editable ? "editable" : ""}`;
  
  const getAriaLabel = () => {
    const ballType = type === "star" ? "Star" : type === "power" ? "Powerball" : "Number";
    const matchStatus = isMatch ? ", Match" : "";
    return `${ballType} ${value}${matchStatus}`;
  };

  if (editable) {
    const ballType = type === "star" ? "star number" : type === "power" ? "powerball number" : "number";
    return (
      <input
        type="number"
        min={min}
        max={max}
        value={value || ""}
        onChange={(e) => {
          const inputValue = e.target.value;
          
          if (inputValue === "") {
            onChange?.(0);
            return;
          }
          
          const num = parseInt(inputValue);
          if (!isNaN(num) && num >= min && num <= max) {
            onChange?.(num);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "e" || e.key === "E" || e.key === "-" || e.key === "+" || e.key === ".") {
            e.preventDefault();
          }
        }}
        className={className}
        placeholder="?"
        aria-label={`Enter your ${ballType} (${min}-${max})`}
      />
    );
  }

  return (
    <span
      className={className}
      style={{ "--value": value } as React.CSSProperties}
      role="img"
      aria-label={getAriaLabel()}
    >
      <span style={{ "--value": value } as React.CSSProperties} aria-hidden="true"></span>
    </span>
  );
}

export default Ball;
