
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Page container with animations
export const PageContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('page-container', className)}>
    {children}
  </div>
);

// Section container
export const SectionContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('py-6', className)}>
    {children}
  </div>
);

// Animated heading
export const AnimatedHeading = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string 
}) => (
  <h2 className={cn('text-3xl font-bold tracking-tight animate-slide-in-up text-balance', className)}>
    {children}
  </h2>
);

// Animated text
export const AnimatedText = ({ 
  children, 
  delay = 0,
  className 
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string 
}) => (
  <p 
    className={cn('text-muted-foreground animate-slide-in-up text-balance', className)}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </p>
);

// Glass card with hover effects
export const GlassCard = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div 
    className={cn(
      'glass-card p-6 animate-scale-in cursor-default',
      onClick && 'hover:scale-[1.02] cursor-pointer',
      className
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

// Stats card
export const StatsCard = ({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}) => {
  const trendColor = 
    trend === 'up' ? 'text-teal-500' : 
    trend === 'down' ? 'text-destructive' : 
    'text-muted-foreground';
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && (
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <div className="flex items-center mt-1">
            {trendValue && (
              <span className={cn('text-sm font-medium mr-1', trendColor)}>
                {trendValue}
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Feature card
export const FeatureCard = ({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}) => (
  <Card className={cn('transition-all hover:shadow-medium hover:border-brand-100', className)}>
    <CardHeader>
      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
        {icon}
      </div>
      <CardTitle className="text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <CardDescription className="text-base">{description}</CardDescription>
    </CardContent>
  </Card>
);

// Profile card
export const ProfileCard = ({
  name,
  role,
  imageUrl,
  details,
  className,
}: {
  name: string;
  role: string;
  imageUrl?: string;
  details: { label: string; value: string }[];
  className?: string;
}) => (
  <Card className={cn('', className)}>
    <CardHeader className="flex flex-col items-center">
      <Avatar className="h-20 w-20 mb-2">
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={name} />
        ) : (
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {name.split(' ').map(part => part[0]).join('').toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      <CardTitle className="text-xl text-center">{name}</CardTitle>
      <Badge variant="secondary" className="mt-1">
        {role}
      </Badge>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {details.map((detail, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <div className="text-sm font-medium text-muted-foreground">{detail.label}</div>
            <div className="text-sm font-medium">{detail.value}</div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Page header with title and actions
export const PageHeader = ({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('mb-8 space-y-4', className)}>
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight animate-slide-in-up">{title}</h1>
        {description && (
          <p className="text-muted-foreground animate-slide-in-up animation-delay-100">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <Separator />
  </div>
);

// Empty state component
export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
    {icon && <div className="h-12 w-12 text-muted-foreground mb-4">{icon}</div>}
    <h3 className="text-lg font-medium mb-1">{title}</h3>
    {description && <p className="text-muted-foreground mb-4">{description}</p>}
    {action}
  </div>
);

// Loading spinner
export const LoadingSpinner = ({ className }: { className?: string }) => (
  <div className={cn('animate-rotate-clockwise h-5 w-5 rounded-full border-2 border-primary border-t-transparent', className)} />
);

// Centered loading spinner with optional message
export const LoadingState = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <LoadingSpinner className="h-8 w-8 mb-3" />
    {message && <p className="text-muted-foreground">{message}</p>}
  </div>
);

// Error state component
export const ErrorState = ({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
    <div className="h-12 w-12 text-destructive mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <h3 className="text-lg font-medium mb-1">{title}</h3>
    {description && <p className="text-muted-foreground mb-4">{description}</p>}
    {action || (
      <Button variant="outline" onClick={() => window.location.reload()}>
        Try Again
      </Button>
    )}
  </div>
);

// Animated transition wrapper
export const AnimatedTransition = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('animate-fade-in', className)}>
    {children}
  </div>
);
