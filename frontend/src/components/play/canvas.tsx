const canvas = ({
  canvasRef,
  startDrawing,
  stopDrawing,
  draw,
  isCurrentDrawer,
  gameState,
  isErasing,
}: any) => {
  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onMouseLeave={stopDrawing}
        className={`border-2 border-gray-300 rounded-lg shadow-lg w-full h-[70vh] bg-white
            ${
              !isCurrentDrawer || gameState.state !== "playing"
                ? "cursor-not-allowed opacity-75"
                : isErasing
                ? "cursor-crosshair"
                : "cursor-crosshair"
            }
            `}
        style={{
          touchAction: "none",
        }}
      />
    </>
  );
};

export default canvas;
