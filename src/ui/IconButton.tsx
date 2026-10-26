import React from "react";
import { Button, type ButtonProps } from "./Button";

export interface IconButtonProps extends Omit<ButtonProps, "children"> {
  icon: React.ReactNode;
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, style, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        style={{
          width: "26px",
          height: "26px",
          minWidth: "26px",
          minHeight: "26px",
          padding: 0,
          ...style,
        }}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";
