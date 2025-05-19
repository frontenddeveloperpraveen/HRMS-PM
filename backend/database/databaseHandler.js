const { MongoClient, ObjectId } = require("mongodb");
const {
  startOfToday,
  subDays,
  startOfMonth,
  subMonths,
  endOfYesterday,
} = require("date-fns");
const { format, parseISO } = require("date-fns");

const uri = "ADD mongo DB URI HERE"; // MongoDB connection string
const client = new MongoClient(uri);
let employee, attendance;
let packagesCollection;

const Working_Hour = 8;

// Cache setup
const employeeCache = new Map(); // Key: userId, Value: { data, expiry }
const attendanceCache = new Map(); // Key: userId, Value: { data, expiry }
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes per entry

const connectDB = async () => {
  try {
    await client.connect();
    const database = client.db("HRMS"); // Your main database
    console.log("Connected with HRMS database successfully -> Done");

    employee = database.collection("employee");
    attendance = database.collection("attendance");

    // Connect to the amasqis database and store the collection reference
    const amasqisDB = client.db("AmasQIS");
    packagesCollection = amasqisDB.collection("packages");

    console.log("Connected with amasqis database successfully -> Done");
  } catch (error) {
    console.error("Database Error Occurred ->", error);
  }
};

// Call the function to connect to the database
connectDB();

const DBCacher = async (userId, Cache, collection) => {
  try {
    // console.log(employee);
    const result = await collection.findOne({
      user_id: userId,
    });

    console.log("DB cacher result -> ", result);
    if (result) {
      // Store in cache with expiry
      Cache.set(userId, {
        data: result,
        expiry: Date.now() + CACHE_TTL, // Set expiry time for this user
      });
      console.log(`Cached details for user: ${userId}`);
    } else {
      console.warn(`No employee details found for userId: ${userId}`);
    }

    return result;
  } catch (error) {
    console.error("Error fetching employee details:", error);
    return null;
  }
};

const LeaveReport = async (userId) => {
  // Check Permission

  // Permission over
  const result = await FetchAttendanceDetails(userId); // Await the function properly
  if (!result) {
    console.error(`No attendance details found for user: ${userId}`);
    return null;
  }

  console.log("Result Returned -> ", result);
  const response = {
    on_time: result.leave_details?.on_time || 0,
    late_attendance: result.leave_details?.late_attendance || 0,
    absent: result.leave_details?.absent || 0,
    woh: result.leave_details?.woh || 0,
    sick_leave: result.leave_details?.sick_leave || 0,
    better: result.leave_details?.better || 0, // Need to calculate manually

    total_leaves: result.leave_statistics?.total_leaves || 0,
    taken_leaves: result.leave_statistics?.taken_leaves || 0,
    absent_days: result.leave_statistics?.absent_days || 0,
    request_leave: result.leave_statistics?.request_leave || 0,
    worked_days: result.leave_statistics?.worked_days || 0,
    loss_pay: result.leave_statistics?.loss_pay || 0,
  };

  return response;
};

const EmployeeDetails = async (userId) => {
  // Check Permission

  //Permission over
  const result = await FetchEmployeeDetails(userId);
  console.log("Result Returned -> ", result);
  const response = {
    name: result.name.first_name + " " + result.name.last_name,
    department: result.department,
    designation: result.designation,
    phone_number: result.phone_number,
    email: result.email_address,
    report_office: result.reporting_office,
    doj: result.date_of_joining,
  };

  console.log("Respinse -> ", response);
  return response;
};

const LeaveDetails = async (userId) => {
  // Check Permission

  // Permission over
  const result = await FetchAttendanceDetails(userId); // Await the function properly
  if (!result) {
    console.error(`No attendance details found for user: ${userId}`);
    return null;
  }

  console.log("Result Returned -> ", result);
  const response = {
    on_time: result.leave_details?.on_time || 0,
    late_attendance: result.leave_details?.late_attendance || 0,
    absent: result.leave_details?.absent || 0,
    woh: result.leave_details?.woh || 0,
    sick_leave: result.leave_details?.sick_leave || 0,
    better: result.leave_details?.better || 0, // Need to calculate manually
  };

  return response;
};

// Function to get employee details with caching
const FetchEmployeeDetails = async (userId) => {
  if (!employee) {
    console.error("Database not connected yet!");
    return null;
  }

  // Check cache first
  if (employeeCache.has(userId)) {
    const cachedData = employeeCache.get(userId);

    // Validate if the cache entry is still valid
    if (cachedData.expiry > Date.now()) {
      console.log(`Returning cached data for user: ${userId}`);
      return cachedData.data;
    } else {
      console.log(`Cache expired for user: ${userId}, removing entry.`);
      employeeCache.delete(userId);
    }
  }

  console.log(`Fetching Employee Details from database for user: ${userId}`);
  //Cacher
  const result = await DBCacher(userId, employeeCache, employee);
  console.log("result -> ", result);
  return result;
};

const FetchAttendanceDetails = async (userId) => {
  if (!attendance) {
    console.error("Database not connected yet!");
    return null;
  }

  // Check cache first
  if (attendanceCache.has(userId)) {
    const cachedData = attendanceCache.get(userId);

    // Validate if the cache entry is still valid
    if (cachedData.expiry > Date.now()) {
      console.log(`Returning cached data for user: ${userId}`);
      return cachedData.data;
    } else {
      console.log(`Cache expired for user: ${userId}, removing entry.`);
      attendanceCache.delete(userId);
    }
  }

  console.log(`Fetching Attedance Details from database for user: ${userId}`);
  //Cacher
  const result = await DBCacher(userId, attendanceCache, attendance);
  console.log("result -> ", result);
  return result;
};

const AddPunchIn = async (userId, time, date) => {
  if (!attendance) {
    console.error("Database not connected yet!");
    return null;
  }

  console.log("Adding Punch-In Time for user:", userId);

  // Fetch only the attendance field
  let result = await attendance.findOne(
    { user_id: userId },
    { attendance: 1, _id: 0 }
  );

  // If user has no attendance record, initialize it
  let attendanceData = result ? result.attendance : {};

  // Check if today's attendance already exists
  if (attendanceData[date]) {
    console.log("Attendance already recorded for today:", date);
    return { done: 0, message: "Already punched in" };
  }

  // Add new attendance entry for today
  attendanceData[date] = {
    punch_in: time,
    break_times: [],
    resume_times: [],
    overtime: null,
    punch_out: null,
  };

  // Update the database with the new attendance data
  await attendance.updateOne(
    { user_id: userId },
    { $set: { attendance: attendanceData } },
    { upsert: true } // Creates a new document if the user_id does not exist
  );

  console.log("Punch-In added successfully.");
  return { done: 1, message: "Punch-In recorded successfully" };
};

const AddBreakTime = async (userId, time, date) => {
  if (!attendance) {
    console.error("Database not connected yet!");
    return null;
  }

  console.log("Adding Break Time for user:", userId);

  // Fetch only the attendance field for efficiency
  let result = await attendance.findOne(
    { user_id: userId },
    { attendance: 1, _id: 0 }
  );

  // If no attendance record, return early
  if (!result || !result.attendance[date]) {
    console.log("No attendance found for today:", date);
    return { done: 0, message: "No punch-in found for today" };
  }

  // Get today's attendance entry
  let attendanceData = result.attendance;
  let todayAttendance = attendanceData[date];

  // Push the new break time into the break_times array
  todayAttendance.break_times.push(time);

  // Update the database with the modified break_times array
  await attendance.updateOne(
    { user_id: userId },
    {
      $set: { [`attendance.${date}.break_times`]: todayAttendance.break_times },
    }
  );

  console.log("Break Time added successfully.");
  return { done: 1, message: "Break time recorded successfully" };
};

const AddResumeTime = async (userId, time, date) => {
  if (!attendance) {
    console.error("Database not connected yet!");
    return null;
  }

  console.log("Adding Resume Time for user:", userId);

  // Fetch only the attendance field for efficiency
  let result = await attendance.findOne(
    { user_id: userId },
    { attendance: 1, _id: 0 }
  );

  // If no attendance record, return early
  if (!result || !result.attendance[date]) {
    console.log("No attendance found for today:", date);
    return { done: 0, message: "No punch-in found for today" };
  }

  // Get today's attendance entry
  let attendanceData = result.attendance;
  let todayAttendance = attendanceData[date];

  // Push the new Resume time into the resume_times array
  todayAttendance.resume_times.push(time);

  // Update the database with the modified Resume_times array
  await attendance.updateOne(
    { user_id: userId },
    {
      $set: {
        [`attendance.${date}.resume_times`]: todayAttendance.resume_times,
      },
    }
  );

  console.log("Resume Time added successfully.");
  return { done: 1, message: "Resume time recorded successfully" };
};

const PunchOut = async (userId, time, date) => {
  if (!attendance) {
    console.error("Database not connected yet!");
    return null;
  }

  console.log("Processing Punch-Out for user:", userId);

  // Fetch only the necessary fields: punch_in, punch_out, and overtime
  let result = await attendance.findOne(
    { user_id: userId, [`attendance.${date}`]: { $exists: true } },
    {
      [`attendance.${date}.punch_in`]: 1,
      [`attendance.${date}.punch_out`]: 1,
      [`attendance.${date}.overtime`]: 1,
      _id: 0,
    }
  );

  // If attendance doesn't exist for today, return early
  if (!result) {
    console.log("No attendance record found for today:", date);
    return { done: 0, message: "No attendance record found for today" };
  }

  let attendanceData = result.attendance[date];

  // Check if punch_out is already recorded
  if (attendanceData.punch_out !== null) {
    console.log("Already punched out for today:", date);
    return { done: 0, message: "Already punched out" };
  }

  // Get punch-in time
  let punchInTime = attendanceData.punch_in; // Stored in string format
  let punchOutTime = time; // New punch-out time (also a string)

  // Function to convert HH:MM:SS string to total seconds
  const timeToSeconds = (timeStr) => {
    let [hours, minutes, seconds] = timeStr.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Convert punch-in and punch-out times to total seconds
  let punchInSeconds = timeToSeconds(punchInTime);
  let punchOutSeconds = timeToSeconds(punchOutTime);

  // Calculate work duration in hours
  let workDuration = (punchOutSeconds - punchInSeconds) / 3600; // Convert seconds to hours

  // Calculate overtime (only if worked more than 8 hours)
  let overtime = null;
  if (workDuration > 8) {
    let overtimeHours = (workDuration - 8).toFixed(2);
    overtime = overtimeHours.toString(); // Store as a string
  }

  // Update the database with punch_out and overtime
  await attendance.updateOne(
    { user_id: userId },
    {
      $set: {
        [`attendance.${date}.punch_out`]: punchOutTime, // Store as string
        [`attendance.${date}.overtime`]: overtime, // Store as string
      },
    }
  );

  console.log("Punch-Out added successfully.");
  return {
    done: 1,
    message: "Punch-Out recorded successfully",
    overtime: overtime,
  };
};

// New Code below this

//Super Admin

const Superadmin_AddPlan = async (userId, plan) => {
  try {
    if (!packagesCollection) {
      console.error("Database not connected yet!");
      return { done: false, message: "Database connection issue" };
    }

    // Generate a unique MongoDB ObjectId and use it as plan_id
    const newPlan = {
      ...plan,
      subscribers: 0,
      plan_id: new ObjectId().toHexString(), // Convert ObjectId to string
      created_by: userId, // Add the user ID who created the plan
      created_at: new Date().toISOString(), // Add UTC timestamp
    };

    const result = await packagesCollection.insertOne(newPlan);
    console.log("Plan added successfully with ID:", newPlan.plan_id);
    return {
      done: true,
      message: "Plan added successfully",
    };
  } catch (error) {
    console.error("Error adding plan:", error);
    return { done: false, message: "Error adding plan" };
  }
};

const Superadmin_GetPlanDetails = async (userId) => {
  try {
    if (!packagesCollection) {
      console.error("Database not connected yet!");
      return { done: false, message: "Database connection issue" };
    }

    console.log("In db");

    const aggregationPipeline = [
      {
        $facet: {
          // Total plans count
          totalPlans: [{ $count: "count" }],

          // Active plans count
          activePlans: [{ $match: { status: "Active" } }, { $count: "count" }],

          // Inactive plans count
          inactivePlans: [
            { $match: { status: "Inactive" } },
            { $count: "count" },
          ],
        },
      },
      {
        $project: {
          totalPlans: { $arrayElemAt: ["$totalPlans.count", 0] },
          activePlans: { $arrayElemAt: ["$activePlans.count", 0] },
          inactivePlans: { $arrayElemAt: ["$inactivePlans.count", 0] },
        },
      },
    ];

    const [result] = await packagesCollection
      .aggregate(aggregationPipeline)
      .toArray();

    return {
      done: true,
      message: "success",
      data: {
        totalPlans: "" + (result.totalPlans || 0),
        activePlans: "" + (result.activePlans || 0),
        inactivePlans: "" + (result.inactivePlans || 0),
        planTypes: "" + 2,
      },
    };
  } catch (error) {
    console.error("Error fetching plan details:", error);
    return { done: false, message: "Error fetching plan details" };
  }
};

const Superadmin_getplan = async ({ type, startDate, endDate }) => {
  try {
    if (!packagesCollection) throw new Error("Database not connected");

    let dateFilter = {};
    const now = new Date();

    const convertDateString = (dateStr) => {
      return dateStr ? new Date(dateStr) : null;
    };

    switch (type) {
      case "today":
        dateFilter.created_at = {
          $gte: startOfToday().toISOString(),
        };
        break;
      case "yesterday":
        dateFilter.created_at = {
          $gte: subDays(startOfToday(), 1).toISOString(),
          $lt: startOfToday().toISOString(),
        };
        break;
      case "last7days":
        dateFilter.created_at = {
          $gte: subDays(now, 7).toISOString(),
        };
        break;
      case "last30days":
        dateFilter.created_at = {
          $gte: subDays(now, 30).toISOString(),
        };
        break;
      case "thismonth":
        dateFilter.created_at = {
          $gte: startOfMonth(now).toISOString(),
        };
        break;
      case "lastmonth":
        dateFilter.created_at = {
          $gte: startOfMonth(subMonths(now, 1)).toISOString(),
          $lt: startOfMonth(now).toISOString(),
        };
        break;
      case "custom":
        if (!startDate || !endDate)
          throw new Error("Missing custom date range");
        dateFilter.created_at = {
          $gte: new Date(startDate).toISOString(),
          $lte: new Date(endDate).toISOString(),
        };
        break;
      default:
        break;
    }

    // 2. Aggregation pipeline
    const pipeline = [
      { $match: dateFilter },
      { $sort: { created_at: -1 } },
      {
        $project: {
          Plan_Name: "$planName",
          Plan_Type: "$planType",
          Total_Subscribers: "$subscribers",
          Price: "$price",
          Status: "$status",
          planid: "$plan_id",
          _id: 0,
          created_at: 1,
        },
      },
    ];

    const plans = await packagesCollection.aggregate(pipeline).toArray();

    const formattedPlans = plans.map((plan) => {
      const date = new Date(plan.created_at);
      return {
        ...plan,
        Created_Date: format(date, "d MMM yyyy"),
      };
    });

    console.log(formattedPlans);

    return {
      done: true,
      message: "success",
      data: formattedPlans,
      count: formattedPlans.length,
    };
  } catch (error) {
    console.error("Error fetching plans:", error);
    return {
      success: false,
      message: error.message,
      data: [],
    };
  }
};

const Superadmin_getoneplan = async (planid) => {
  try {
    if (!packagesCollection) throw new Error("Internal Server Error");
    const plan = await packagesCollection.findOne({
      plan_id: planid,
    });
    delete plan.created_at;
    delete plan.created_by;
    delete plan.subscribers;
    delete plan._id;
    return {
      done: true,
      message: "success",
      data: plan,
    };
  } catch (error) {
    console.error("Error fetching plans:", error);
    return {
      done: false,
      message: error.message,
      data: [],
    };
  }
};

const Superadmin_UpdatePlan = async (form) => {
  try {
    if (!packagesCollection) throw new Error("Internal Server Error");
    console.log("Plan id is ", form.plan_id);
    // 1. First find the existing document
    const existingPlan = await packagesCollection.findOne({
      plan_id: form.plan_id,
    });

    if (!existingPlan) {
      throw new Error("Plan not found");
    }

    // 2. Prepare the update data - merge new form with preserved fields
    const updateData = {
      ...form,
      created_by: existingPlan.created_by,
      created_at: existingPlan.created_at,
      subscribers: existingPlan.subscribers,
      // Make sure to convert planModules array to the format your schema expects
      planModules: Array.isArray(form.planModules) ? form.planModules : [],
    };

    // 3. Perform the update
    const result = await packagesCollection.updateOne(
      { plan_id: form.plan_id },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      throw new Error("No changes made or plan not found");
    }

    return {
      done: true,
      message: "Plan updated successfully",
      data: { ...updateData, _id: form._id },
    };
  } catch (error) {
    console.error("Error updating plan:", error);
    return {
      done: false,
      message: error.message,
      data: null,
    };
  }
};

const Superadmin_DeletePlan = async (planids) => {
  try {
    if (!packagesCollection) throw new Error("Internal Server Error");

    // Deleting all records where plan_id is in the provided planids array
    const result = await packagesCollection.deleteMany({
      plan_id: { $in: planids },
    });

    return {
      done: true,
      message: `${result.deletedCount} plans deleted successfully.`,
      data: null,
    };
  } catch (error) {
    console.error("Error deleting plans:", error);
    return {
      done: false,
      message: error.message,
      data: null,
    };
  }
};

module.exports = {
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
};
