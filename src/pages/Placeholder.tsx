const PlaceholderPage = ({ title, description }: { title: string; description: string }) => (
  <div className="container py-20 text-center max-w-xl">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="text-muted-foreground mt-3">{description}</p>
    <p className="text-sm text-accent mt-6 font-medium">Coming in the next build phase.</p>
  </div>
);

export default PlaceholderPage;
