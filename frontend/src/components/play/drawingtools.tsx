import { Button, Slider } from "antd";
import { LuEraser } from "react-icons/lu";

const drawingtools = ({
  currentColor,
  currentStroke,
  isErasing,
  handleColorChange,
  handleStrokeChange,
  toggleEraser,
  clearCanvas,
}: any) => {
  return (
    <div>
      <div className="space-y-2">
        <div className="text-sm font-semibold">Colors</div>
        <div className="flex flex-wrap gap-2">
          {[
            "black",
            "red",
            "green",
            "blue",
            "yellow",
            "orange",
            "purple",
            "brown",
          ].map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 ${
                currentColor === color && !isErasing
                  ? "border-blue-500 ring-2 ring-blue-300"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">
          Stroke Width: {currentStroke}px
        </div>
        <Slider
          min={2}
          max={20}
          step={2}
          value={currentStroke}
          onChange={handleStrokeChange}
        />
      </div>

      <div className="flex space-x-2">
        <button
          className={`p-2 rounded flex items-center justify-center ${
            isErasing
              ? "ring-2 ring-blue-500 bg-blue-100"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={toggleEraser}
        >
          <LuEraser />
        </button>
        <Button onClick={clearCanvas} type="dashed" className="flex-1">
          Clear Canvas
        </Button>
      </div>
    </div>
  );
};

export default drawingtools;
