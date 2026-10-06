import { AiOutlineLoading } from "react-icons/ai";

function PantallaCarga() {
  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center">
      <AiOutlineLoading
        className="animate-spin text-blue-500 text-3xl"
        size={18}
      />
    </div>
  );
}

export default PantallaCarga;
