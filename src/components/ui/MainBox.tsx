export default function MainBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-4 p-6 bg-white rounded-2xl shadow-2xl `}>
      {children}
    </div>
  );
}
