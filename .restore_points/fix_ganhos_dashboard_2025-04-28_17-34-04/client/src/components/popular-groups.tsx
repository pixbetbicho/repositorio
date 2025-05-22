import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Animal, PopularGroup } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export function PopularGroups() {
  const { data: popularGroups, isLoading } = useQuery<PopularGroup[]>({
    queryKey: ["/api/admin/stats/popular"],
  });

  const { data: animals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  // Enhance popular groups with animal data and calculate percentages
  const enhancedGroups = popularGroups && animals ? popularGroups.map(group => {
    const animal = animals.find(a => a.id === group.animalId);
    // Calculate percentage based on the highest count
    const maxCount = Math.max(...popularGroups.map(g => g.count));
    const percentage = Math.round((group.count / maxCount) * 100);
    
    return {
      ...group,
      animal,
      percentage
    };
  }).slice(0, 5) : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Grupos Mais Apostados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupos Mais Apostados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {enhancedGroups.length > 0 ? (
            enhancedGroups.map((group) => (
              <div key={group.animalId} className="flex items-center">
                <div className="w-20 mr-4 text-sm font-medium">
                  Grupo {group.animal ? String(group.animal.group).padStart(2, '0') : ''}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-primary h-4 rounded-full" 
                    style={{ width: `${group.percentage}%` }}
                  ></div>
                </div>
                <div className="ml-4 text-sm font-medium">{group.percentage}%</div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">
              Ainda não há dados de apostas disponíveis
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
