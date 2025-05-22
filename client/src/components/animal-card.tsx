import { Animal } from "@/types";
import { cn } from "@/lib/utils";
import { getAnimalEmoji, getGroupGradient } from "@/lib/animal-icons";

interface AnimalCardProps {
  animal: Animal;
  selected?: boolean;
  onClick: (animal: Animal) => void;
}

export function AnimalCard({ animal, selected = false, onClick }: AnimalCardProps) {
  const handleClick = () => {
    onClick(animal);
  };

  const animalEmoji = getAnimalEmoji(animal.name);
  const headerBgClass = getGroupGradient(animal.group);
  
  return (
    <div 
      className={cn(
        "animal-card bg-card rounded-lg overflow-hidden transition-all cursor-pointer border shadow-sm hover:shadow-md",
        selected 
          ? "ring-3 ring-primary border-primary transform scale-[1.02]" 
          : "border-border hover:border-primary/60"
      )}
      onClick={handleClick}
    >
      <div className={`${headerBgClass} p-2.5 text-white text-center`}>
        <span className="text-sm font-bold">
          Grupo {String(animal.group).padStart(2, '0')}
        </span>
      </div>
      <div className="p-4 text-center">
        <div className="w-20 h-20 mx-auto flex items-center justify-center text-5xl">
          {animalEmoji}
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{animal.name}</h3>
        <div className="mt-3 text-xs flex flex-wrap justify-center gap-1.5">
          {animal.numbers.map((number, index) => (
            <span 
              key={index} 
              className="inline-flex items-center justify-center w-7 h-7 bg-muted text-muted-foreground rounded-full font-medium"
            >
              {number}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
