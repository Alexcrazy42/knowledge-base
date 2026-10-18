import { useState } from "react"
import styles from './DatePicker.module.css'

export interface DatePickerProps {
    onDateSelected: (date: Date) => void;
}

export function DatePicker ({ onDateSelected } : DatePickerProps) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const [month, setMonth] = useState<number>(currentMonth);
    const [year, setYear] = useState<number>(currentYear);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const handlePrev = () => {
        setSelectedDate(null);
        if (month === 0) {
            setMonth(11);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNext = () => {
        setSelectedDate(null);
        if (month === 11) {
            setMonth(0);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    const selectDate = (date: Date) => {
        setSelectedDate(date);
        onDateSelected(date);
    }



    const dateToString = (date) => {
        if(date == null) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const generateDays = () => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // getDay(): 0 = воскресенье, 1 = понедельник... 6 = суббота
        // Нам нужно: 0     = понедельник, 6 = воскресенье
        let startDayOfWeek = firstDay.getDay() - 1;
        if (startDayOfWeek === -1) startDayOfWeek = 6;
        
        const daysInMonth = lastDay.getDate();
        
        const days = [];
        
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className={`${styles.day} ${styles.empty}`} />);
        }
        
        // Дни месяца
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const isSelectedDay = dateToString(selectedDate) === dateToString(date);

            const dayClasses = [
                styles.day,
                isSelectedDay && styles.selected
            ].filter(Boolean).join(' ');

            days.push(
                <div key={day} className={dayClasses} onClick={() => selectDate(date)}>
                    {day}
                </div>
            );
        }
        
        return days;
    };



    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    return (
        <div className={styles.calendar}>
            <div className={styles.controls}>
                <button className={styles.previous} onClick={handlePrev}>Назад</button>

                <span className={styles.currentDate}>
                    {monthNames[month]} {year}
                </span>

                <button className={styles.next} onClick={handleNext}>Вперед</button>
            </div>

            <div className={styles.dates}>
                {weekdays.map(day => (
                    <div key={day} className={styles.weekday}>
                        {day}
                    </div>
                ))}
                
                {generateDays()}
            </div>
        </div>
    )
}