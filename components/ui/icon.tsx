import { Icon as IconifyIcon, type IconProps } from "@iconify/react";

export type { IconProps };

export const Icon = (props: IconProps) => <IconifyIcon {...props} />;
