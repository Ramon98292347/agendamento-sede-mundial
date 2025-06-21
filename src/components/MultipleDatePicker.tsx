
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MultipleDatePickerProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  placeholder?: string;
}

const MultipleDatePicker: React.FC<MultipleDatePickerProps> = ({
  selectedDates,
  onDatesChange,
  placeholder = "Selecione as datas"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const dateExists = selectedDates.some(
      selectedDate => format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    if (dateExists) {
      // Remove a data se já estiver selecionada
      onDatesChange(selectedDates.filter(
        selectedDate => format(selectedDate, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd')
      ));
    } else {
      // Adiciona a nova data
      onDatesChange([...selectedDates, date]);
    }
  };

  const removeDate = (dateToRemove: Date) => {
    onDatesChange(selectedDates.filter(
      date => format(date, 'yyyy-MM-dd') !== format(dateToRemove, 'yyyy-MM-dd')
    ));
  };

  const clearAllDates = () => {
    onDatesChange([]);
  };

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              selectedDates.length === 0 && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDates.length > 0 
              ? `${selectedDates.length} data(s) selecionada(s)`
              : placeholder
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Selecione múltiplas datas</h4>
              {selectedDates.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllDates}
                  className="text-xs"
                >
                  Limpar todas
                </Button>
              )}
            </div>
            <Calendar
              mode="single"
              onSelect={handleDateSelect}
              className={cn("p-3 pointer-events-auto")}
              modifiers={{
                selected: selectedDates
              }}
              modifiersStyles={{
                selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
              }}
              disabled={(date) => date < new Date()}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Lista das datas selecionadas */}
      {selectedDates.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">Datas selecionadas:</p>
          <div className="flex flex-wrap gap-1">
            {selectedDates.map((date, index) => (
              <div
                key={index}
                className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs"
              >
                <span>{format(date, 'dd/MM/yyyy', { locale: ptBR })}</span>
                <button
                  onClick={() => removeDate(date)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleDatePicker;
