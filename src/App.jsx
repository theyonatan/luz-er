import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// ----- Empty Calendar Data (starts empty) -----
const initialWeekData = {
  week_start: "2025-03-09",
  days: [
    { day: "ראשון", events: [] },
    { day: "שני", events: [] },
    { day: "שלישי", events: [] },
    { day: "רביעי", events: [] },
    { day: "חמישי", events: [] }
  ]
};

// ----- Default Event Types (all pastel) -----
const initialEventTypes = {
  "Python": "#B3FFB3",      // Pastel Green
  "CPP": "#FF8A8A",         // Pastel Dark Red
  "C": "#FFB3B3",           // Pastel Red
  "Web": "#B3D9FF",         // Pastel Blue
  "מטודולוגיות": "#FFB3E6", // Pastel Pink
  "רשתות": "#B3E5FF",       // Pastel Light Blue
  "פעילויות": "#FFB3FF",     // Pastel Magenta
  "הפסקת אוכל": "#E0E0E0",    // Pastel Light Gray
  "אחר": "#CCCCCC",         // Pastel Gray
  "DB": "#FFFFB3",          // Pastel Yellow
  "DE": "#FFD9B3"           // Pastel Orange
};

// ----- Utility Functions -----
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function snapToQuarterHour(mins) {
  const quarter = 15;
  return Math.round(mins / quarter) * quarter;
}
function getPositionFromTime(timeStr, slotHeight) {
  const startDayTime = 7.5 * 60; // 07:30
  const t = timeToMinutes(timeStr);
  return ((t - startDayTime) / 15) * slotHeight;
}
function getTimeFromPosition(offsetPx, slotHeight) {
  const startDayTime = 7.5 * 60;
  const minutesFromStart = (offsetPx / slotHeight) * 15 + startDayTime;
  return minutesToTime(snapToQuarterHour(minutesFromStart));
}
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function App() {
  const [weekData, setWeekData] = useState(initialWeekData);
  const [eventTypes, setEventTypes] = useState(initialEventTypes);
  const [adminMode, setAdminMode] = useState(false);

  // Selected event for editing (admin mode only)
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventDay, setSelectedEventDay] = useState(null);
  const [tempEventData, setTempEventData] = useState(null);

  // Current time line offset (in px)
  const [currentTimeOffset, setCurrentTimeOffset] = useState(null);

  // On mount, try to load calendarData.json from the public folder.
  useEffect(() => {
    fetch('/src/calendarData.json')
      .then(res => {
        if (res.ok) return res.json();
        else throw new Error('No file');
      })
      .then(data => setWeekData(data))
      .catch(err => {
        console.log('No external calendarData.json found, using default.');
      });
  }, []);

  useEffect(() => {
    const updateCurrentTimeLine = () => {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;
      const start = 7.5;
      const end = 22.5;
      if (hours < start || hours > end) {
        setCurrentTimeOffset(null);
      } else {
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const offsetMinutes = totalMinutes - start * 60;
        const px = (offsetMinutes / 15) * 20; // slotHeight = 20
        setCurrentTimeOffset(px);
      }
    };
    updateCurrentTimeLine();
    const timer = setInterval(updateCurrentTimeLine, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Toggle admin mode by clicking the word "פסי" in the header.
  const toggleAdminMode = () => {
    if (!adminMode) {
      const pass = prompt("הכנס סיסמת ניהול:");
      if (pass === "admin") {
        setAdminMode(true);
      } else {
        alert("סיסמה שגויה");
      }
    } else {
      setAdminMode(false);
      closeLeftPanel();
    }
  };

  // Only in admin mode: clicking an event opens the edit panel.
  const handleEventClick = (dayName, eventObj) => {
    if (!adminMode) return;
    setSelectedEventDay(dayName);
    setSelectedEvent(eventObj);
    setTempEventData({ ...eventObj });
  };

  const saveEventChanges = () => {
    if (!tempEventData.title) {
      alert("אנא הכנס כותרת לאירוע");
      return;
    }
    if (!tempEventData.type) {
      alert("אנא בחר סוג אירוע");
      return;
    }
    if (timeToMinutes(tempEventData.end) <= timeToMinutes(tempEventData.start)) {
      alert("שעת הסיום חייבת להיות אחרי שעת ההתחלה");
      return;
    }
    // Use the event type’s color (default white if missing)
    const typeColor = eventTypes[tempEventData.type] || "#ffffff";
    const updatedEvent = { ...tempEventData, color: typeColor };
    const newDays = weekData.days.map(dayObj => {
      if (dayObj.day !== selectedEventDay) return dayObj;
      const updatedEvents = dayObj.events.map(ev =>
        ev.id === updatedEvent.id ? updatedEvent : ev
      );
      return { ...dayObj, events: updatedEvents };
    });
    setWeekData({ ...weekData, days: newDays });
    closeLeftPanel();
  };

  const closeLeftPanel = () => {
    setSelectedEvent(null);
    setSelectedEventDay(null);
    setTempEventData(null);
  };

  const removeEvent = () => {
    if (!window.confirm("האם למחוק אירוע זה?")) return;
    const newDays = weekData.days.map(dayObj => {
      if (dayObj.day !== selectedEventDay) return dayObj;
      return { ...dayObj, events: dayObj.events.filter(ev => ev.id !== tempEventData.id) };
    });
    setWeekData({ ...weekData, days: newDays });
    closeLeftPanel();
  };

  // Create new event on double-click (admin mode only)
  const handleDoubleClickDay = (dayName, offsetY) => {
    if (!adminMode) return;
    const slotHeight = 20;
    const startTime = getTimeFromPosition(offsetY, slotHeight);
    const startMins = timeToMinutes(startTime);
    const endTime = minutesToTime(startMins + 15);
    const newId = generateId();
    setSelectedEventDay(dayName);
    setSelectedEvent({ id: newId, title: "", start: startTime, end: endTime, type: "" });
    setTempEventData({ id: newId, title: "", start: startTime, end: endTime, type: "" });
  };

  const saveNewEvent = () => {
    if (!tempEventData.title) {
      alert("אנא הכנס כותרת לאירוע");
      return;
    }
    if (!tempEventData.type) {
      alert("אנא בחר סוג אירוע");
      return;
    }
    const typeColor = eventTypes[tempEventData.type] || "#ffffff";
    const newEvent = { ...tempEventData, color: typeColor };
    const newDays = weekData.days.map(dayObj => {
      if (dayObj.day !== selectedEventDay) return dayObj;
      return { ...dayObj, events: [...dayObj.events, newEvent] };
    });
    setWeekData({ ...weekData, days: newDays });
    closeLeftPanel();
  };

  // ----- Admin Panel: Event Types & JSON Import/Export -----
  const [editingType, setEditingType] = useState(null);
  const [editingTypeNewName, setEditingTypeNewName] = useState("");
  const [editingTypeNewColor, setEditingTypeNewColor] = useState("#ffffff");

  const handleAddEventType = () => {
    if (!editingTypeNewName.trim()) {
      alert("אנא הזן שם סוג אירוע");
      return;
    }
    setEventTypes({ ...eventTypes, [editingTypeNewName]: editingTypeNewColor });
    setEditingTypeNewName("");
    setEditingTypeNewColor("#ffffff");
  };

  const handleRemoveEventType = (typeKey) => {
    if (!window.confirm(`האם למחוק את סוג האירוע "${typeKey}"?`)) return;
    const newTypes = { ...eventTypes };
    delete newTypes[typeKey];
    setEventTypes(newTypes);
  };

  const handleEditEventType = (typeKey) => {
    setEditingType(typeKey);
    setEditingTypeNewName(typeKey);
    setEditingTypeNewColor(eventTypes[typeKey]);
  };

  const saveTypeEdits = () => {
    if (!editingTypeNewName.trim()) {
      alert("אנא הזן שם סוג אירוע");
      return;
    }
    const newTypes = { ...eventTypes };
    if (editingTypeNewName !== editingType) {
      delete newTypes[editingType];
    }
    newTypes[editingTypeNewName] = editingTypeNewColor;
    setEventTypes(newTypes);
    setEditingType(null);
    setEditingTypeNewName("");
    setEditingTypeNewColor("#ffffff");
  };

  const cancelTypeEdits = () => {
    setEditingType(null);
    setEditingTypeNewName("");
    setEditingTypeNewColor("#ffffff");
  };

  // ----- JSON Import/Export -----
  const handleDownloadJson = () => {
    const dataStr = JSON.stringify(weekData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calendarData.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef(null);
  const handleUploadJson = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const onJsonFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const newData = JSON.parse(evt.target.result);
        setWeekData(newData);
        alert("הקובץ נטען בהצלחה!");
      } catch (err) {
        alert("שגיאה בקריאת קובץ ה-JSON");
      }
    };
    reader.readAsText(file);
  };

  // ----- Drag-to-Resize (admin mode only) for a selected event -----
  const handleEventDragChange = (eventId, newStart, newEnd, isTop) => {
    if (selectedEvent && selectedEvent.id === eventId) {
      const newDays = weekData.days.map(day => {
        if (day.day === selectedEventDay) {
          const newEvents = day.events.map(ev => {
            if (ev.id === eventId) {
              return {
                ...ev,
                start: isTop ? newStart : ev.start,
                end: !isTop ? newEnd : ev.end
              };
            }
            return ev;
          });
          return { ...day, events: newEvents };
        }
        return day;
      });
      setWeekData({ ...weekData, days: newDays });
      setTempEventData(prev => ({
        ...prev,
        start: isTop ? newStart : prev.start,
        end: !isTop ? newEnd : prev.end,
      }));
    }
  };

  return (
    <div className="app-container">
      {/* ----- Left Panel: Event Detail (admin mode only) ----- */}
      {adminMode && selectedEvent && (
        <div className="left-panel animate-in">
          <h2>פרטי אירוע</h2>
          <div className="form-group">
            <label>כותרת:</label>
            <input
              type="text"
              value={tempEventData?.title || ""}
              onChange={e => setTempEventData({ ...tempEventData, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>סוג אירוע:</label>
            <select
              value={tempEventData?.type || ""}
              onChange={e => setTempEventData({ ...tempEventData, type: e.target.value })}
            >
              <option value="">בחר סוג אירוע</option>
              {Object.keys(eventTypes).map(typeKey => (
                <option key={typeKey} value={typeKey}>
                  {typeKey}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>התחלה:</label>
            <input
              type="time"
              value={tempEventData?.start || "07:30"}
              onChange={e => setTempEventData({ ...tempEventData, start: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>סיום:</label>
            <input
              type="time"
              value={tempEventData?.end || "07:45"}
              onChange={e => setTempEventData({ ...tempEventData, end: e.target.value })}
            />
          </div>
          {weekData.days.find(d => d.day === selectedEventDay)?.events.some(ev => ev.id === selectedEvent.id) ? (
            <div className="btn-group">
              <button onClick={saveEventChanges}>שמור</button>
              <button onClick={removeEvent}>מחק</button>
              <button onClick={closeLeftPanel}>ביטול</button>
            </div>
          ) : (
            <div className="btn-group">
              <button onClick={saveNewEvent}>צור אירוע</button>
              <button onClick={closeLeftPanel}>ביטול</button>
            </div>
          )}
        </div>
      )}

      {/* ----- Main Calendar Area ----- */}
      <div className="calendar-wrapper">
        <h1 className="main-title">
          לו"ז קורס <span className="admin-trigger" onClick={toggleAdminMode}>פסי</span>
        </h1>
        {/* Scrollable container that holds day columns and time labels.
            Set to LTR so that time labels appear on the right and scroll together. */}
        <div className="scrollable-calendar">
          <div className="day-columns">
            {weekData.days.slice().reverse().map(dayObj => (
              <DayColumn
                key={dayObj.day}
                dayObj={dayObj}
                adminMode={adminMode}
                selectedEventId={selectedEvent ? selectedEvent.id : null}
                currentTimeOffset={currentTimeOffset}
                onEventClick={handleEventClick}
                onDayDoubleClick={handleDoubleClickDay}
                onDragChange={handleEventDragChange}
                eventTypes={eventTypes}
              />
            ))}
          </div>
          <TimeLabels />
        </div>
      </div>

      {/* ----- Right Panel: Admin Panel ----- */}
      {adminMode && (
        <div className="right-panel animate-in">
          <h2>ניהול</h2>
          <div className="admin-section">
            <h3>ייצוא/ייבוא JSON</h3>
            <button onClick={handleDownloadJson}>הורד JSON</button>
            <button onClick={handleUploadJson}>העלה JSON</button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={onJsonFileSelected}
            />
          </div>
          <div className="admin-section">
            <h3>סוגי אירועים</h3>
            {Object.entries(eventTypes).map(([typeKey, color]) => (
              <div key={typeKey} className="type-row">
                <span className="type-name">{typeKey}</span>
                <span className="type-color-block" style={{ backgroundColor: color }}></span>
                <button onClick={() => handleEditEventType(typeKey)}>ערוך</button>
                <button onClick={() => handleRemoveEventType(typeKey)}>מחק</button>
              </div>
            ))}
            {editingType ? (
              <div className="edit-type-form">
                <label>שם סוג חדש:</label>
                <input
                  type="text"
                  value={editingTypeNewName}
                  onChange={e => setEditingTypeNewName(e.target.value)}
                />
                <label>צבע:</label>
                <input
                  type="color"
                  value={editingTypeNewColor}
                  onChange={e => setEditingTypeNewColor(e.target.value)}
                />
                <div className="btn-group">
                  <button onClick={saveTypeEdits}>שמור</button>
                  <button onClick={cancelTypeEdits}>ביטול</button>
                </div>
              </div>
            ) : (
              <div className="edit-type-form">
                <label>הוסף סוג אירוע:</label>
                <input
                  type="text"
                  placeholder="סוג אירוע חדש"
                  value={editingTypeNewName}
                  onChange={e => setEditingTypeNewName(e.target.value)}
                />
                <label>צבע:</label>
                <input
                  type="color"
                  value={editingTypeNewColor}
                  onChange={e => setEditingTypeNewColor(e.target.value)}
                />
                <button onClick={handleAddEventType}>הוסף</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayColumn({ dayObj, adminMode, selectedEventId, currentTimeOffset, onEventClick, onDayDoubleClick, onDragChange, eventTypes }) {
  const slotHeight = 20;
  const totalSlots = (22.5 * 60 - 7.5 * 60) / 15;
  const handleDoubleClick = (e) => {
    if (!adminMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    onDayDoubleClick(dayObj.day, offsetY);
  };

  return (
    <div className="day-column" onDoubleClick={handleDoubleClick}>
      <div className="day-header">{dayObj.day}</div>
      {currentTimeOffset !== null && (
        <div className="current-time-line" style={{ top: currentTimeOffset }}></div>
      )}
      <div className="day-body" style={{ height: totalSlots * slotHeight }}>
        {dayObj.events.map(eventObj => {
          const top = getPositionFromTime(eventObj.start, slotHeight);
          const height = getPositionFromTime(eventObj.end, slotHeight) - top;
          return (
            <EventBlock
              key={eventObj.id}
              dayName={dayObj.day}
              eventObj={eventObj}
              top={top}
              height={height}
              adminMode={adminMode}
              isSelected={selectedEventId === eventObj.id}
              onEventClick={onEventClick}
              onDragChange={onDragChange}
              eventTypes={eventTypes}
            />
          );
        })}
      </div>
    </div>
  );
}

function EventBlock({ dayName, eventObj, top, height, adminMode, isSelected, onEventClick, onDragChange, eventTypes }) {
  const slotHeight = 20;
  // Use the color from eventTypes (default white)
  const bgColor = eventTypes[eventObj.type] || "#ffffff";

  // Drag handle for top edge
  const handleTopDragStart = (e) => {
    e.stopPropagation();
    const startY = e.clientY;
    const initialTop = getPositionFromTime(eventObj.start, slotHeight);
    const onMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newTop = initialTop + deltaY;
      let newStartTime = getTimeFromPosition(newTop, slotHeight);
      if (timeToMinutes(newStartTime) >= timeToMinutes(eventObj.end)) {
        newStartTime = eventObj.start;
      }
      onDragChange(eventObj.id, newStartTime, eventObj.end, true);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Drag handle for bottom edge
  const handleBottomDragStart = (e) => {
    e.stopPropagation();
    const startY = e.clientY;
    const initialBottom = getPositionFromTime(eventObj.end, slotHeight);
    const onMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newBottom = initialBottom + deltaY;
      let newEndTime = getTimeFromPosition(newBottom, slotHeight);
      if (timeToMinutes(newEndTime) <= timeToMinutes(eventObj.start)) {
        newEndTime = eventObj.end;
      }
      onDragChange(eventObj.id, eventObj.start, newEndTime, false);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className="event-block"
      style={{
        top: top,
        height: height,
        backgroundColor: bgColor
      }}
      onClick={() => onEventClick(dayName, eventObj)}
    >
      <div className="event-type-badge">{eventObj.type}</div>
      <span className="event-title">{eventObj.title}</span>
      {adminMode && isSelected && (
        <>
          <div className="drag-handle top-handle" onMouseDown={handleTopDragStart}></div>
          <div className="drag-handle bottom-handle" onMouseDown={handleBottomDragStart}></div>
        </>
      )}
    </div>
  );
}

function TimeLabels() {
  const slotHeight = 20;
  const startDayTime = 7.5 * 60;
  const endDayTime = 22.5 * 60;
  const totalSlots = (endDayTime - startDayTime) / 15;
  return (
    <div className="time-labels">
      {Array.from({ length: totalSlots + 1 }).map((_, i) => {
        const mins = startDayTime + i * 15;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        return (
          <div key={i} className="time-label">{timeStr}</div>
        );
      })}
    </div>
  );
}

export default App;
