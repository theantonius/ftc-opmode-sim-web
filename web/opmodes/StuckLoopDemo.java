package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;

// Demo: a loop that never checks opModeIsActive() and ignores STOP.
// Press INIT, PLAY, then STOP. After 5 seconds the Driver Station says the
// code is stuck and the motor stops. Don't do this on a real robot!
@TeleOp(name = "Stuck Loop Demo")
public class StuckLoopDemo extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");

        telemetry.addLine("Press PLAY, then STOP.");
        telemetry.update();
        waitForStart();

        frontRight.setPower(0.5);
        telemetry.addLine("Spinning forever...");
        telemetry.addLine("This loop ignores STOP.");
        telemetry.update();

        while (true) {
            // never checks opModeIsActive()
        }
    }
}
