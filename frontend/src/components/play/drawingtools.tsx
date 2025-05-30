import { Button, Tooltip } from "antd";
import { BiMinus, BiPlus } from "react-icons/bi";
import { LuEraser, LuTrash2 } from "react-icons/lu";

const DrawingTools = ({
  currentColor,
  currentStroke,
  isErasing,
  handleColorChange,
  handleStrokeChange,
  toggleEraser,
  clearCanvas,
}: any) => {
  
  // FIX: Prevent event bubbling and add proper event handling
  const handleStrokePlus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStrokeChange(Math.min(currentStroke + 1, 16));
  };

  const handleStrokeMinus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStrokeChange(Math.max(currentStroke - 1, 2));
  };

  const handleColorClick = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleColorChange(color);
  };

  const handleEraserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleEraser();
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearCanvas();
  };

  return (
    <div className="w-12 bg-white shadow-md rounded p-2 flex flex-col items-center gap-3">
      {/* Colors */}
      <div className="flex flex-col gap-1">
        {["black", "red", "blue", "green", "yellow"].map((color) => (
          <button
            key={color}
            onClick={(e) => handleColorClick(e, color)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              currentColor === color && !isErasing
                ? "border-blue-500 ring-2 ring-blue-300"
                : "border-gray-300 hover:border-gray-400"
            }`}
            style={{ backgroundColor: color }}
            type="button" // Explicitly set button type
          />
        ))}
      </div>

      {/* Brush Size */}
      <div className="flex flex-col items-center">
        <div className="text-[10px] bg-gray-100 px-1 rounded mb-1">
          {currentStroke}px
        </div>
        
        {/* FIX: Add proper button structure and event handling */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleStrokePlus}
            className="text-lg px-1 text-gray-700 hover:text-blue-500 flex items-center justify-center"
          >
            <BiPlus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleStrokeMinus}
            className="text-lg px-1 text-gray-700 hover:text-blue-500 flex items-center justify-center"
          >
            <BiMinus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tools */}
      <div className="flex flex-col items-center gap-2">
        <Tooltip title="Eraser" placement="right">
          <button
            type="button"
            onClick={handleEraserClick}
            className={`w-6 h-6 flex items-center justify-center rounded ${
              isErasing
                ? "bg-red-100 text-red-600 border border-red-400"
                : "bg-gray-100 text-gray-600 border border-gray-300 hover:border-gray-400"
            }`}
          >
            <LuEraser className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip title="Clear Canvas" placement="right">
          <Button
            type="default"
            onClick={handleClearClick}
            danger
            icon={<LuTrash2 className="w-4 h-4" />}
            className="!p-0 !w-6 !h-6 flex items-center justify-center"
            size="small"
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default DrawingTools;
