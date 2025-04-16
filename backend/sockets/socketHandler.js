const { response } = require("express");
const databaseHandler = require("../database/databaseHandler");
const SuperadminDB = require("../database/SuperadminDatabaseHandler");

// Structure
const { Package_stats, Company_add } = SuperadminDB;
const {
  EmployeeDetails,
  LeaveDetails,
  LeaveReport,
  AddPunchIn,
  AddBreakTime,
  AddResumeTime,
  PunchOut,
  Superadmin_AddPlan,
  Superadmin_GetPlanDetails,
  Superadmin_getplan,
  Superadmin_getoneplan,
  Superadmin_UpdatePlan,
  Superadmin_DeletePlan,
} = databaseHandler;

const roles = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
};

const Form_validator = (form, expectedStructure) => {
  // Check if form has all expected fields
  const expectedKeys = Object.keys(expectedStructure);
  const formKeys = Object.keys(form);

  // Check for missing fields
  for (const key of expectedKeys) {
    if (!formKeys.includes(key)) {
      console.error(`Missing field: ${key}`);
      return false;
    }
  }

  // Check for extra fields
  for (const key of formKeys) {
    if (!expectedKeys.includes(key)) {
      console.error(`Unexpected field: ${key}`);
      return false;
    }
  }

  // Check types
  for (const [key, expectedType] of Object.entries(expectedStructure)) {
    const value = form[key];
    const actualType = typeof value;

    // Special handling for arrays
    if (expectedType === "array") {
      if (!Array.isArray(value)) {
        console.error(`Field ${key} should be an array`);
        return false;
      }
      continue;
    }

    // Special handling for null (if needed)
    if (expectedType === "null" && value !== null) {
      console.error(`Field ${key} should be null`);
      return false;
    }

    // Normal type checking
    if (actualType !== expectedType && expectedType !== "null") {
      console.error(
        `Field ${key} should be ${expectedType} but got ${actualType}`
      );
      return false;
    }
  }

  return true;
};

// Key Map for storing active users

const socketHandler = (io, socket) => {
  // Employee Dashboard
  // Employee Details

  socket.on("superadmin/packages/add-plan", async (plan) => {
    if (socket.role == roles.SUPERADMIN) {
      console.log("Super Admin is trying to add plan");
      console.log("Received plan data:", plan); // Debugging
      // Validate the form
      const expectedStructure = {
        planName: "string",
        planType: "string",
        price: "number",
        planPosition: "string",
        planCurrency: "string",
        planCurrencytype: "string",
        discountType: "string",
        discount: "number",
        limitationsInvoices: "number",
        maxCustomers: "number",
        product: "number",
        supplier: "number",
        planModules: "array",
        accessTrial: "boolean",
        trialDays: "number",
        isRecommended: "boolean",
        status: "string",
        description: "string",
        logo: "string",
      };
      if (Form_validator(plan, expectedStructure)) {
        let res = await Superadmin_AddPlan(socket.user.sub, plan); // Ensure `await` is used
        socket.emit("superadmin/packages/add-plan-response", res);
        if (res.done) {
          const updatedPlans = await Superadmin_getplan({});
          io.to("superadmin_room").emit(
            "superadmin/packages/planlist-response",
            updatedPlans
          );
        }
      } else {
        console.log("Wrong Form Stucture");
        socket.emit("superadmin/packages/add-plan-response", {
          done: false,
          message: "Request Parameter is false",
        });
      }
    } else {
      console.log("No permission");
      socket.emit("superadmin/packages/add-plan-response", {
        done: false,
        message: "No Permission for this route",
      });
    }
  });
  socket.on("superadmin/packages/update-plan", async (plan) => {
    if (socket.role == roles.SUPERADMIN) {
      console.log("Super Admin is trying to update plan");
      console.log("Received plan data:", plan); // Debugging
      // Validate the form
      const expectedStructure = {
        plan_id: "string",
        planName: "string",
        planType: "string",
        price: "number",
        planPosition: "string",
        planCurrency: "string",
        planCurrencytype: "string",
        discountType: "string",
        discount: "number",
        limitationsInvoices: "number",
        maxCustomers: "number",
        product: "number",
        supplier: "number",
        planModules: "array",
        accessTrial: "boolean",
        trialDays: "number",
        isRecommended: "boolean",
        status: "string",
        description: "string",
        logo: "string",
      };
      if (Form_validator(plan, expectedStructure)) {
        let res = await Superadmin_UpdatePlan(plan); // Ensure `await` is used
        socket.emit("superadmin/packages/update-plan-response", res);
        if (res.done) {
          const updatedPlans = await Superadmin_getplan({});
          io.to("superadmin_room").emit(
            "superadmin/packages/planlist-response",
            updatedPlans
          );
        }
      } else {
        console.log("Wrong Form Stucture");
        socket.emit("superadmin/packages/add-plan-response", {
          done: false,
          message: "Request Parameter is false",
        });
      }
    } else {
      console.log("No permission");
      socket.emit("superadmin/packages/add-plan-response", {
        done: false,
        message: "No Permission for this route",
      });
    }
  });
  socket.on("superadmin/packages/delete-plan", async (planids) => {
    if (socket.role == roles.SUPERADMIN) {
      console.log("Super Admin is trying to delete plan");
      console.log("Received delete plan id:", planids); // Debugging
      // Validate the form

      let res = await Superadmin_DeletePlan(planids); // Ensure `await` is used
      socket.emit("superadmin/packages/delete-plan-response", res);
      if (res.done) {
        const updatedPlans = await Superadmin_getplan({});
        io.to("superadmin_room").emit(
          "superadmin/packages/planlist-response",
          updatedPlans
        );
      }
    } else {
      console.log("No permission");
      socket.emit("superadmin/packages/add-plan-response", {
        done: false,
        message: "No Permission for this route",
      });
    }
  });

  socket.on("superadmin/packages/plan-details", async () => {
    if (socket.role == roles.SUPERADMIN) {
      console.log("Working");
      let res = await Superadmin_GetPlanDetails(socket.user.sub);
      console.log(res);
      socket.emit("superadmin/packages/plan-details-response", res);
    } else {
      console.log("No permission");
      socket.emit("superadmin/packages/plan-details-response", {
        done: false,
        message: "No Permission for this route",
      });
    }
  });

  socket.on("superadmin/packages/planlist", async (values) => {
    // {}
    if (socket.role == roles.SUPERADMIN) {
      console.log("New request for pplan lisy");
      let res = await Superadmin_getplan(values);
      console.log(res);
      socket.emit("superadmin/packages/planlist-response", res);
    } else {
    }
  });

  socket.on("superadmin/packages/get-plan", async (planid) => {
    if (socket.role == roles.SUPERADMIN) {
      console.log("Super admin is getting plan");
      let res = await Superadmin_getoneplan(planid);
      console.log(res);
      socket.emit("superadmin/packages/get-plan-response", res);
    } else {
      console.log("No permission");
      socket.emit("superadmin/packages/add-plan-response", {
        done: false,
        message: "No Permission for this route",
      });
    }
  });

  socket.on("superadmin/packages/stats", async () => {
    console.log("Requested for superadmin Package Stats");
    const userID = socket.user.sub;
    const stats = await Package_stats(userID);
    socket.emit("response_superadmin/packages/stats", stats);
  });

  socket.on("superadmin/add/company", async (details) => {
    console.log("Requested for superadmin comapny add");
    const userID = socket.user.sub;
    // Check for Permission
    const response = await Company_add(details);
    socket.emit("response_superadmin/add/company", response);
  });

  socket.on("request_employee_details", async () => {
    const userId = socket.user.sub;
    console.log("Employee detaiks user id for-> ", userId);
    await new Promise((r) => setTimeout(r, 5000));
    const employeeDetails = await EmployeeDetails(userId);

    socket.emit("dashboard_response", employeeDetails);
  });

  // Employee Leave Details
  socket.on("request_employee_leave_details", async () => {
    const userId = socket.user.sub;
    console.log(userId, "requested for emloyee leave");
    const leave_details = await LeaveDetails(userId);
    socket.emit("employee_leave_details_response", leave_details);
  });

  // Employee Leave Report

  socket.on("request_employee_leave_report", async () => {
    const userId = socket.user.sub;
    console.log(userId, "requested for emloyee report");
    const leave_report = await LeaveReport(userId);
    socket.emit("employee_leave_report_response", leave_report);
  });

  //Employee Skills
  socket.on("request_employee_skills", async () => {
    const userId = socket.user.sub;
    console.log(userId, "is requested for employee skills");
    const employee_skills = await fetchemployeeskillsFromDatabase(userId);
    socket.emit("employee_skills_response", employee_skills);
  });

  // Punch IN Attendace

  const punchInrequest = [];

  socket.on("employee_punchIn", async () => {
    const userId = socket.user.sub;
    if (!punchInrequest.includes(userId)) {
      punchInrequest.push(userId);
      console.log(userId, "Pressed Punch In button");
      const date = new Date();
      const todaydate = date.toLocaleDateString("en-GB");
      const returndate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const railwayTime = date.toLocaleTimeString("en-GB"); // 24-hour format
      const amPmTime = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }); // 12-hour format
      console.log("date : ");
      console.log(`Timestamp (24-hour): ${railwayTime}`);
      console.log(`Timestamp (12-hour AM/PM): ${amPmTime}`);
      // Add punch in time to today's date in the database
      var response = {
        date: returndate,
        time: amPmTime,
      };
      const result = await AddPunchIn(userId, `${railwayTime}`, `${todaydate}`);
      socket.emit("employee_punchIn_reponse", response);
      punchInrequest.pop(userId);
    } else {
      console.log("User aldready clicked request is processing");
      return;
    }
  });

  const breakrequest = [];

  socket.on("employee_break", async () => {
    const userId = socket.user.sub;
    if (!breakrequest.includes(userId)) {
      breakrequest.push(userId);
      console.log(userId, "Pressed break button");
      const date = new Date();
      const returndate = date.toLocaleDateString("en-GB");

      const railwayTime = date.toLocaleTimeString("en-GB"); // 24-hour format
      console.log("date : ");
      console.log(`Timestamp (24-hour): ${railwayTime}`);
      // Add punch in time to today's date in the database
      var response = {
        date: returndate,
        time: railwayTime,
      };

      console.log("Response of break request : ", response);
      socket.emit("employee_break_response", response);
      await AddBreakTime(userId, `${railwayTime}`, `${returndate}`);
      breakrequest.pop(userId);
    } else {
      console.log("User aldready clicked break request is processing");
      return;
    }
  });

  const resumerequest = [];

  socket.on("employee_resume", async () => {
    const userId = socket.user.sub;
    if (!resumerequest.includes(userId)) {
      resumerequest.push(userId);
      console.log(userId, "Pressed resume button");
      const date = new Date();
      const returndate = date.toLocaleDateString("en-GB");

      const railwayTime = date.toLocaleTimeString("en-GB"); // 24-hour format
      console.log("date : ");
      console.log(`Timestamp (24-hour): ${railwayTime}`);
      // Add punch in time to today's date in the database
      var response = {
        date: returndate,
        time: railwayTime,
      };

      console.log("Response of resume request : ", response);
      socket.emit("employee_resume_response", response);
      await AddResumeTime(userId, `${railwayTime}`, `${returndate}`);
      resumerequest.pop(userId);
    } else {
      console.log("User aldready clicked resume request is processing");
      return;
    }
  });

  const punchOutrequest = [];

  socket.on("employee_punch_out", async () => {
    const userId = socket.user.sub;
    if (!punchOutrequest.includes(userId)) {
      punchOutrequest.push(userId);
      console.log(userId, "Pressed punch out button");
      const date = new Date();
      const returndate = date.toLocaleDateString("en-GB");
      const railwayTime = date.toLocaleTimeString("en-GB"); // 24-hour format
      console.log("date : ");
      console.log(`Timestamp (24-hour): ${railwayTime}`);
      // Add punch in time to today's date in the database
      var response = {
        date: returndate,
        time: railwayTime,
      };

      console.log("Response of punch out request : ", response);
      await PunchOut(userId, `${railwayTime}`, `${returndate}`);
      punchOutrequest.pop(userId);
    } else {
      console.log("User aldready clicked punch out request is processing");
      return;
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.user.sub} disconnected`);
  });
};

async function fetchleaveFromDatabase(userId) {
  return {
    on_time: 10,
    late_attendance: 20,
    absent: 14,
    woh: 5,
    sick_leave: 68,
    better: -30,
  };
}

async function fetchEmployeeDetailsFromDatabase(userId) {
  await new Promise((r) => setTimeout(r, 5000));

  return {
    name: "Praveen KR",
    department: "Software Engineer",
    designation: "Backend Developer",
    phone_number: "123-456-7890",
    email: "praveen@example.com",
    report_office: "Chennai",
    doj: "2025-01-01",
  };
}

async function fetchleavereportFromDatabase(UserId) {
  return {
    total_leaves: 10,
    taken_leaves: 5,
    absent_days: 11,
    request_leave: 5,
    worked_days: 204,
    loss_pay: 2,
  };
}

async function fetchemployeeskillsFromDatabase(userId) {
  await new Promise((r) => setTimeout(r, 5000));
  return [
    {
      name: "Figma",
      last_updated: "06-02-2025",
      skill: 80,
    },
    {
      name: "Docker",
      last_updated: "04-01-2025",
      skill: 75,
    },
    {
      name: "HTML",
      last_updated: "02-02-2025",
      skill: 95,
    },
    {
      name: "CSS",
      last_updated: "01-02-2025",
      skill: 90,
    },
    {
      name: "ML",
      last_updated: "05-02-2025",
      skill: 10,
    },
    {
      name: "ML",
      last_updated: "05-02-2025",
      skill: 10,
    },
    {
      name: "ML",
      last_updated: "05-02-2025",
      skill: 10,
    },
    {
      name: "ML",
      last_updated: "05-02-2025",
      skill: 10,
    },
    {
      name: "ML",
      last_updated: "05-02-2025",
      skill: 10,
    },
    {
      name: "ML",
      last_updated: "05-02-2025",
      skill: 10,
    },
  ];
}

module.exports = socketHandler;
