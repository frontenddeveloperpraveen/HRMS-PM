import React, { useState, useEffect } from "react";
import { DateRangePicker } from "react-bootstrap-daterangepicker";
import moment from "moment";
import "bootstrap/dist/css/bootstrap.min.css"; // Add this line
import "bootstrap-daterangepicker/daterangepicker.css";

interface DateRange {
  start: string;
  end: string;
}

interface PredefinedDateRangesProps {
  onChange?: (range: DateRange) => void;
  value?: DateRange;
}

const PredefinedDateRanges: React.FC<PredefinedDateRangesProps> = ({
  onChange,
  value,
}) => {
  const [range, setRange] = useState<DateRange>({
    start: value?.start || "1970-01-01T00:00:00Z",
    end: value?.end || moment.utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
  });

  useEffect(() => {
    if (value) {
      setRange({
        start: value.start,
        end: value.end,
      });
    }
  }, [value]);

  const handleApply = (event: any, picker: any) => {
    const newRange = {
      start: picker.startDate.utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
      end: picker.endDate.utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
    };

    setRange(newRange);
    onChange?.(newRange);
  };

  const startMoment = moment.utc(range.start);
  const endMoment = moment.utc(range.end);
  const label = `${startMoment.format("MM/DD/YYYY")} - ${endMoment.format(
    "MM/DD/YYYY"
  )}`;

  return (
    <div className="date-range-container" style={{ minWidth: "250px" }}>
      <DateRangePicker
        initialSettings={{
          startDate: startMoment.toDate(),
          endDate: endMoment.toDate(),
          ranges: {
            "All Time": [
              moment.utc("1970-01-01").toDate(),
              moment.utc().toDate(),
            ],
            Today: [moment.utc().toDate(), moment.utc().toDate()],
            Yesterday: [
              moment.utc().subtract(1, "days").toDate(),
              moment.utc().subtract(1, "days").toDate(),
            ],
            "Last 7 Days": [
              moment.utc().subtract(6, "days").toDate(),
              moment.utc().toDate(),
            ],
            "Last 30 Days": [
              moment.utc().subtract(29, "days").toDate(),
              moment.utc().toDate(),
            ],
            "This Month": [
              moment.utc().startOf("month").toDate(),
              moment.utc().endOf("month").toDate(),
            ],
            "Last Month": [
              moment.utc().subtract(1, "month").startOf("month").toDate(),
              moment.utc().subtract(1, "month").endOf("month").toDate(),
            ],
          },
        }}
        onApply={handleApply}
      >
        <button
          className="btn btn-default"
          style={{
            border: "1px solid #ccc",
            padding: "6px 12px",
            borderRadius: "4px",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          <i className="fa fa-calendar" style={{ marginRight: "8px" }}></i>
          <span>{label}</span>
          <i className="fa fa-caret-down" style={{ marginLeft: "8px" }}></i>
        </button>
      </DateRangePicker>
    </div>
  );
};

export default PredefinedDateRanges;
