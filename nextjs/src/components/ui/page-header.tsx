import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className = "" }: PageHeaderProps) {
  return (
    <Card className={className}>
      <CardHeader className={children ? "flex flex-row items-center justify-between" : ""}>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {children && <div>{children}</div>}
      </CardHeader>
    </Card>
  );
}