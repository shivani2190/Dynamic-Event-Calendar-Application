import React from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  category: "work" | "personal" | "other";
}

interface CalendarProps {
  events: Record<string, Event[]>;
  onDaySelect: (date: Date) => void;
  onEventClick: (e: React.MouseEvent, event: Event, date: Date) => void;
  selectedDate: Date | null;
  onMonthChange: (date: Date) => void;
  currentMonth: Date;
  searchQuery: string;
  onEventDragEnd: (result: DropResult) => void;
}

const getCategoryColor = (category: Event['category']) => {
  switch (category) {
    case 'work':
      return 'bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200';
    case 'personal':
      return 'bg-emerald-100 border-emerald-200 text-emerald-800 hover:bg-emerald-200';
    case 'other':
      return 'bg-purple-100 border-purple-200 text-purple-800 hover:bg-purple-200';
  }
};

const Calendar: React.FC<CalendarProps> = ({
  events,
  onDaySelect,
  onEventClick,
  selectedDate,
  onMonthChange,
  currentMonth,
  searchQuery,
  onEventDragEnd
}) => {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startingDayIndex = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: Date[] = [];
    const firstDay = new Date(firstDayOfMonth);
    firstDay.setDate(1 - startingDayIndex);
    
    const totalDays = startingDayIndex + daysInMonth;
    const numberOfWeeks = Math.ceil(totalDays / 7);
    const daysToShow = numberOfWeeks * 7;
    
    for (let i = 0; i < daysToShow; i++) {
      days.push(new Date(firstDay));
      firstDay.setDate(firstDay.getDate() + 1);
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    onMonthChange(newDate);
  };

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentMonth.getMonth();

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const isSelected = (date: Date) => {
    return selectedDate && 
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const getFilteredEvents = (dateEvents: Event[]): Event[] => {
    if (!searchQuery) return dateEvents;
    
    const query = searchQuery.toLowerCase();
    return dateEvents.filter(event => 
      event.title.toLowerCase().includes(query) ||
      (event.description || '').toLowerCase().includes(query)
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <DragDropContext onDragEnd={onEventDragEnd}>
      <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col max-h-screen overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={handlePrevMonth}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={handleNextMonth}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 hover:bg-gray-100"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={cn(
                "text-center py-1.5 font-semibold text-sm",
                index === 0 || index === 6 ? "text-red-500" : "text-gray-600"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto min-h-0">
          {days.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayEvents = getFilteredEvents(events[dateKey] || []);
            
            return (
              <div
                key={index}
                className={cn(
                  "relative min-h-[100px] max-h-[120px]",
                  isCurrentMonth(date) ? "bg-white" : "bg-gray-50"
                )}
              >
                <Droppable droppableId={dateKey}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="absolute inset-0 p-1.5"
                    >
                      <button
                        onClick={() => onDaySelect(date)}
                        className={cn(
                          "w-full h-full rounded-lg border transition-all duration-200 flex flex-col overflow-hidden",
                          isCurrentMonth(date) 
                            ? "hover:shadow-md hover:border-blue-400" 
                            : "bg-gray-50/50 text-gray-400",
                          isToday(date) && "ring-2 ring-blue-500 ring-offset-2",
                          isSelected(date) && "bg-blue-50 border-blue-500",
                          isWeekend(date) && isCurrentMonth(date) && "bg-gray-50",
                          "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded-full text-sm",
                            isToday(date) && "bg-blue-500 text-white",
                            isSelected(date) && !isToday(date) && "bg-blue-100",
                            isWeekend(date) && isCurrentMonth(date) && !isToday(date) && "text-red-500"
                          )}>
                            {date.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 overflow-hidden flex-1">
                          {dayEvents.slice(0, 2).map((event, eventIndex) => (
                            <Draggable
                              key={event.id}
                              draggableId={event.id}
                              index={eventIndex}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick(e, event, date);
                                  }}
                                  className={cn(
                                    "w-full text-left text-xs p-1 rounded-md hover:opacity-75 transition-opacity border",
                                    getCategoryColor(event.category)
                                  )}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  <div className="text-[10px] truncate opacity-75">
                                    {event.startTime} - {event.endTime}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-blue-500 text-center bg-blue-50 rounded-md py-0.5">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
};

export default Calendar;
