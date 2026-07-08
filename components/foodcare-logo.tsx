export const FoodcareLogo = ({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/foodcare-logo.svg"
    alt="Foodcare"
    width={size}
    height={size}
    className={`shrink-0 rounded-xl ${className}`}
  />
);
