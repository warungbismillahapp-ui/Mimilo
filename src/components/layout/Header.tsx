interface Props {
  title?: string;
  rightElement?: React.ReactNode;
  showLogo?: boolean;
}

const Header = ({ title, rightElement, showLogo = false }: Props) => {
  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-sky-500 to-blue-400 shadow-md">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showLogo && (
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-extrabold text-lg leading-none">M</span>
            </div>
          )}
          <span className="text-white font-bold text-lg tracking-wide">
            {title || 'MIMILO'}
          </span>
        </div>
        {rightElement && <div>{rightElement}</div>}
      </div>
    </div>
  );
};

export default Header;
