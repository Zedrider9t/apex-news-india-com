export function SectionHeading({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {kicker && <p className="section-kicker">{kicker}</p>}
        <h2>
          {title}
          <span>.</span>
        </h2>
      </div>
      {children}
    </div>
  );
}
