package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;

// Runs the 10 mecanum drive patterns, 2 seconds each.
// Watch the circle in the middle of the robot: it shows the direction.
@TeleOp(name = "Mecanum Patterns", group = "Testing")
public class MecanumPatterns extends LinearOpMode {

    private DcMotor frontLeft, frontRight, backLeft, backRight;

    private static final double POWER = 0.5;
    private static final double STEP_TIME = 2.0;

    @Override
    public void runOpMode() {
        frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        backRight = hardwareMap.get(DcMotor.class, "backRight");

        // Left motors are mounted flipped: reverse them so +power drives forward.
        frontLeft.setDirection(DcMotor.Direction.REVERSE);
        backLeft.setDirection(DcMotor.Direction.REVERSE);

        telemetry.addLine("MECANUM PATTERNS");
        telemetry.addLine("Raise wheels off ground, then press PLAY.");
        telemetry.update();

        waitForStart();

        //    pattern                   FL  FR  BL  BR
        drive("Forward",                1,  1,  1,  1);
        drive("Backward",              -1, -1, -1, -1);
        drive("Strafe left",           -1,  1,  1, -1);
        drive("Strafe right",           1, -1, -1,  1);
        drive("Diagonal fwd-left",      0,  1,  1,  0);
        drive("Diagonal fwd-right",     1,  0,  0,  1);
        drive("Diagonal back-left",    -1,  0,  0, -1);
        drive("Diagonal back-right",    0, -1, -1,  0);
        drive("Turn left (CCW)",       -1,  1, -1,  1);
        drive("Turn right (CW)",        1, -1,  1, -1);

        setPowers(0, 0, 0, 0);
        telemetry.addLine("All 10 patterns done.");
        telemetry.addLine("Press STOP to exit.");
        telemetry.update();
        while (opModeIsActive()) {
            idle();
        }
    }

    /** Runs one pattern for STEP_TIME seconds. Values are -1, 0 or 1 times POWER. */
    private void drive(String name, double fl, double fr, double bl, double br) {
        ElapsedTime timer = new ElapsedTime();
        setPowers(fl * POWER, fr * POWER, bl * POWER, br * POWER);
        while (opModeIsActive() && timer.seconds() < STEP_TIME) {
            telemetry.addData("Pattern", name);
            telemetry.addData("FL / FR", "%.1f / %.1f", fl * POWER, fr * POWER);
            telemetry.addData("BL / BR", "%.1f / %.1f", bl * POWER, br * POWER);
            telemetry.addData("Time left", "%.1f s", STEP_TIME - timer.seconds());
            telemetry.update();
            idle();
        }
    }

    private void setPowers(double fl, double fr, double bl, double br) {
        frontLeft.setPower(fl);
        frontRight.setPower(fr);
        backLeft.setPower(bl);
        backRight.setPower(br);
    }
}
