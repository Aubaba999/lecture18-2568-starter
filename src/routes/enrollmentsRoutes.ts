import { Router, type Request, type Response } from "express";
import { zStudentId } from "../libs/zodValidators.js";
import { zEnrollmentBody } from "../libs/zodValidators.js";
import { type CustomRequest, type User } from "../libs/types.js";
import type { Student, Enrollment } from "../libs/types.js";
// import database
import { reset_students, students } from "../db/db.js";

import { authenticateToken } from "../middlewares/authenMiddleware.js";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.js";
import { checkRoleStudent } from "../middlewares/checkRoleStudentMiddleware.js";
import { checkRole } from "../middlewares/checkRoleAllMiddleware.js";
import { check, success } from "zod";
import { parse } from "path";

const router = Router();
// /api/v2/enrollments
router.get("/", authenticateToken, checkRoleAdmin,(req: Request, res: Response) => {
  try{ 
  return res.status(200).json({
          success: true,
          message: "Enrollments Information",
          data: 
            students.map((stud)=> {
                let studentId = stud.studentId
                let courses = stud.courses?.map((course)=>{
                  return {"courseId" : course}
                })
                if(!courses)courses = [];
                return {studentId , courses}
            })
          })
        }catch(err){
          
        }
})
router.post("/reset", authenticateToken, checkRoleAdmin, (req: Request, res: Response) => {
  try{
    reset_students()
    return res.json({
      success: true,
      message: "enrollments database has been reset"
    })
  }catch (err){

  }

})
router.get("/:studentId", authenticateToken, checkRole, (req: CustomRequest, res:Response) => {
  const payload_ = req.user;
  const studentId_ = req.params.studentId
  if(payload_?.role === "ADMIN"){
    const parseResult = zStudentId.safeParse(studentId_)
     if (!parseResult.success) {
          return res.status(400).json({
            message: "Validation failed",
            errors: parseResult.error.issues[0]?.message,
          });
        }
        const data = students.findIndex((s: Student) => s.studentId === studentId_)
        if (data === -1) {
          return res.status(404).json({
            success: false,
            message: `StudentId ${studentId_} does not exists`,
          });
        }
        return res.json({
            success: true,
            message: "Student Information",
            data: students[data]
        })
    /*
     try {
        const courseId = req.params.courseId;
        const parseResult = zCourseId.safeParse(courseId);
    
        if (!parseResult.success) {
          return res.status(400).json({
            message: "Validation failed",
            errors: parseResult.error.issues[0]?.message,
          });
        }
    
        const foundIndex = courses.findIndex(
          (c: Course) => c.courseId === courseId
        );
    
        if (foundIndex === -1) {
          return res.status(404).json({
            success: false,
            message: `Course ${courseId} does not exists`,
          });
        }
    
        res.status(200).json({
          success: true,
          data: courses[foundIndex],
        });
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Something is wrong, please try again",
          error: err,
        });
      }
    
    */    
  }
  if(payload_?.role === "STUDENT"){
    if(studentId_ != payload_.studentId){
      return res.status(403).json({
        success: false,
        message: "Forbidden access"
      })
    }
const parseResult = zStudentId.safeParse(studentId_)
     if (!parseResult.success) {
          return res.status(400).json({
            message: "Validation failed",
            errors: parseResult.error.issues[0]?.message,
          });
        }
        const data = students.find((s: Student) => s.studentId === studentId_)
        return res.json({
            success: true,
            message: "Student Information",
            data
            
        })

  }
})

router.post("/:studentId" , authenticateToken, checkRoleStudent, (req: Request, res: Response)=> {
  const body_ = req.body as Enrollment
  const param_ = req.params.studentId
  const result = zEnrollmentBody.safeParse(body_)
  if(!result.success){
    return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues[0]?.message,})
  }
  if(body_.studentId.toString() !== param_){
    return res.status(409).json({
      success: false,
      message: "You are not allowed to modify another student's data"
    })
  }
  
const finder = students.findIndex((stud) => stud.studentId == body_.studentId)
const changer = students[finder]
if(changer)if(changer?.courses === undefined)changer.courses = [];
if(changer?.courses?.find((course)=> course == body_.courseId))return res.status(409).json({succes: "false", message: "studentId && courseId is already exists"})
changer?.courses?.push(body_.courseId.toString())
if(changer)students[finder] = {...students[finder],...changer}
return res.status(201).json({
  success: true,
  message: `Student ${param_} && Course ${body_.courseId} has been added successfully`,
  data: {
    studentId: param_,
    courseId: body_.courseId
  }
})
})
router.delete("/:studentId" , authenticateToken, (req: CustomRequest, res: Response)=> {
  const payload_ = req.user
  const body_ = req.body as Enrollment
  const param_ = req.params.studentId
  const result = zEnrollmentBody.safeParse(body_)
  if(payload_?.role === "ADMIN" || !payload_ || (payload_.studentId != param_)){
    return res.status(403).json({
      success: false,
      message: "You are not allowed to modify another student's data"
    })
  }

  if(!result.success){
    return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues[0]?.message,})
  }
  if(body_.studentId.toString() !== param_){
    return res.status(409).json({
      success: false,
      message: "requested studentId parameter mismatched with JSON body: studentId"
    })
  }

const finder = students.findIndex((stud) => stud.studentId == body_.studentId)
const enrollfind = students.find((stud) => stud.studentId == body_.studentId)?.courses?.findIndex((course) => course === body_.courseId)
if(enrollfind == -1)return res.status(404).json({
  success: false,
  message: "Enrollment does not exists"
})
students[finder]?.courses?.splice(students[finder]?.courses?.findIndex((course)=> course == body_.courseId))
return res.status(201).json({
  success: true,
  message: `Student ${param_} && Course ${body_.courseId} has been deleted successfully`,
  data: students[finder]
})
})
export default router;