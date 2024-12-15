import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import EventModal from './components/EventModal';
import { Clock, CalendarDays, Plus, Search, Download } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { DropResult } from '@hello-pangea/dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  category: "work" | "personal" | "other";
}

// Local Storage key for events
const EVENTS_STORAGE_KEY = 'calendar_events';

// Helper functions for localStorage
const loadEventsFromStorage = (): Record<string, Event[]> => {
  try {
    const storedEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
    return storedEvents ? JSON.parse(storedEvents) : {};
  } catch (error) {
    console.error('Error loading events from localStorage:', error);
    return {};
  }
};

const saveEventsToStorage = (events: Record<string, Event[]>) => {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Error saving events to localStorage:', error);
  }
};

// Helper function to check for time overlap
const hasTimeOverlap = (event1: Event, event2: Event): boolean => {
  const start1 = new Date(`2000-01-01T${event1.startTime}`);
  const end1 = new Date(`2000-01-01T${event1.endTime}`);
  const start2 = new Date(`2000-01-01T${event2.startTime}`);
  const end2 = new Date(`2000-01-01T${event2.endTime}`);

  return start1 < end2 && end1 > start2;
};

function App() {
  const [events, setEvents] = useState<Record<string, Event[]>>(loadEventsFromStorage());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Save events to localStorage whenever they change
  useEffect(() => {
    saveEventsToStorage(events);
  }, [events]);

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
    // If selected date is not in the new month view, clear it
    if (selectedDate && (
      selectedDate.getMonth() !== date.getMonth() ||
      selectedDate.getFullYear() !== date.getFullYear()
    )) {
      setSelectedDate(null);
      setShowAddEvent(false);
    }
  };

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    setShowAddEvent(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: Event, date: Date) => {
    e.stopPropagation();
    setSelectedDate(date);
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (eventData: Omit<Event, 'id'>) => {
    if (!selectedDate) return;

    const dateKey = selectedDate.toISOString().split('T')[0];
    const newEvents = { ...events };
    const existingEvents = newEvents[dateKey] || [];

    // Create the new event object
    const newEvent = {
      ...eventData,
      id: selectedEvent?.id || Math.random().toString(36).substr(2, 9),
    };

    // Check for time overlap with existing events
    const hasOverlap = existingEvents.some(event => 
      event.id !== newEvent.id && hasTimeOverlap(event, newEvent)
    );

    if (hasOverlap) {
      alert('This time slot overlaps with an existing event. Please choose a different time.');
      return;
    }

    if (selectedEvent) {
      // Edit existing event
      newEvents[dateKey] = existingEvents.map(event =>
        event.id === selectedEvent.id ? newEvent : event
      );
    } else {
      // Create new event
      newEvents[dateKey] = [...existingEvents, newEvent];
    }

    setEvents(newEvents);
    setSelectedEvent(undefined);
    setIsEventModalOpen(false);
  };

  const handleDeleteEvent = (event?: Event) => {
    if (!event || !selectedDate) return;

    const dateKey = selectedDate.toISOString().split('T')[0];
    const newEvents = { ...events };

    // Remove the event from the selected date
    newEvents[dateKey] = newEvents[dateKey].filter((e) => e.id !== event.id);

    // If no events left for this date, remove the date entry
    if (newEvents[dateKey].length === 0) {
      delete newEvents[dateKey];
    }

    setEvents(newEvents);
    saveEventsToStorage(newEvents);
    setIsEventModalOpen(false);
  };

  const handleEventDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceDate = result.source.droppableId;
    const destinationDate = result.destination.droppableId;
    const eventIndex = result.source.index;

    // If dropped in the same day and same position, do nothing
    if (sourceDate === destinationDate && result.source.index === result.destination.index) {
      return;
    }

    const newEvents = { ...events };
    
    // Remove event from source date
    const [movedEvent] = newEvents[sourceDate].splice(eventIndex, 1);
    
    // Initialize destination date array if it doesn't exist
    if (!newEvents[destinationDate]) {
      newEvents[destinationDate] = [];
    }

    // Add event to destination date
    newEvents[destinationDate].splice(result.destination.index, 0, movedEvent);

    // Update state and save to storage
    setEvents(newEvents);
    saveEventsToStorage(newEvents);
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(undefined);
  };

  const getFilteredEvents = (dateEvents: Event[]): Event[] => {
    if (!searchQuery) return dateEvents;
    
    const query = searchQuery.toLowerCase();
    return dateEvents.filter(event => 
      event.title.toLowerCase().includes(query) ||
      (event.description || '').toLowerCase().includes(query)
    );
  };

  const getSelectedDateEvents = () => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split('T')[0];
    const dateEvents = events[dateKey] || [];
    return getFilteredEvents(dateEvents);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleExportEvents = (format: "json" | "csv") => {
    const currentMonthEvents: Event[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      if (events[dateKey]) {
        currentMonthEvents.push(...events[dateKey]);
      }
    }

    if (format === "json") {
      const jsonString = JSON.stringify(currentMonthEvents, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `events-${currentMonth.toISOString().slice(0, 7)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const headers = ["id", "title", "startTime", "endTime", "description", "category"];
      const csvContent = [
        headers.join(","),
        ...currentMonthEvents.map(event =>
          headers.map(header => {
            const value = event[header as keyof Event] || "";
            return `"${value.toString().replace(/"/g, '""')}"`
          }).join(",")
        )
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `events-${currentMonth.toISOString().slice(0, 7)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between py-4 px-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Event Calendar
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportEvents("json")}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportEvents("csv")}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-1 gap-6 p-6 overflow-hidden">
          <div className="flex-1 min-w-[800px]">
            <Calendar
              events={events}
              onDaySelect={handleDaySelect}
              onEventClick={handleEventClick}
              selectedDate={selectedDate}
              onMonthChange={handleMonthChange}
              currentMonth={currentMonth}
              searchQuery={searchQuery}
              onEventDragEnd={handleEventDragEnd}
            />
          </div>
          
          <div className="w-[400px] bg-white rounded-xl shadow-lg overflow-hidden flex flex-col shrink-0">
            {!selectedDate ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-center p-6">
                <div>
                  <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No date selected</p>
                  <p className="text-sm mt-1">Click on a date to view its events</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                    Events
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 flex items-center">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    {formatDate(selectedDate)}
                  </p>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  {showAddEvent && getSelectedDateEvents().length === 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        Add Your First Event
                      </h3>
                      <p className="text-sm text-blue-700 mb-4">
                        Start organizing your day by adding an event to your calendar.
                      </p>
                      <Button
                        onClick={() => setIsEventModalOpen(true)}
                        className="w-full bg-blue-500 hover:bg-blue-600"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Event
                      </Button>
                    </div>
                  )}
                  {getSelectedDateEvents().length > 0 ? (
                    <>
                      {showAddEvent && (
                        <Button
                          onClick={() => setIsEventModalOpen(true)}
                          className="w-full mb-4 bg-blue-500 hover:bg-blue-600"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Event
                        </Button>
                      )}
                      <div className="space-y-4">
                        {getSelectedDateEvents()
                          .sort((a, b) => a.startTime.localeCompare(b.startTime))
                          .map((event) => (
                            <button
                              key={event.id}
                              onClick={(e) => handleEventClick(e, event, selectedDate)}
                              className="w-full text-left group bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {event.title}
                              </h3>
                              <div className="mt-1 text-sm text-gray-500 flex items-center">
                                <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span>
                                  {event.startTime} - {event.endTime}
                                </span>
                              </div>
                              {event.description && (
                                <p className="mt-2 text-sm text-gray-600">
                                  {event.description}
                                </p>
                              )}
                            </button>
                          ))}
                      </div>
                    </>
                  ) : !showAddEvent ? (
                    <div className="text-center text-gray-500 py-12">
                      <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No events scheduled</p>
                      <p className="text-sm mt-1">Click on a date to add an event</p>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <EventModal
        isOpen={isEventModalOpen}
        onClose={handleCloseEventModal}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        selectedDate={selectedDate}
      />
    </div>
  );
}

export default App;
