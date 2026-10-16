import {
  Icon as IconifyIcon,
  addCollection,
  type IconProps as IconifyIconProps,
} from "@iconify/react";

import mdiSubset from "@/lib/icons/mdi-subset.json";

// Register the bundled icons once, so they draw immediately instead of being
// downloaded the first time they appear (which made icons flicker or vanish).
// After adding a new icon, run `npm run build:icons`.
addCollection(mdiSubset);

/** The only icon sizes in the dashboard: small 16, medium 20, large 24, extra large 32. */
const sizes = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

export type IconSize = keyof typeof sizes;

export interface IconProps
  extends Omit<IconifyIconProps, "icon" | "width" | "height"> {
  icon: string;
  size?: IconSize;
}

export const Icon = ({ size = "md", ...props }: IconProps) => (
  <IconifyIcon
    width={sizes[size]}
    height={sizes[size]}
    // Icons next to text are decoration; screen readers skip them unless they carry their own label.
    aria-hidden={props["aria-label"] ? undefined : true}
    {...props}
  />
);
