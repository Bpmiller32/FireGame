using Godot;

namespace FireGame;

public class Fall : BaseState
{
    private double jumpBufferTimer;
    private double coyoteTimer;

    public override void Enter()
    {
        GD.Print("Entered Fall");
        jumpBufferTimer = 0;
        coyoteTimer = Player.CoyoteTime;
    }

    public override PlayerStates UpdateInput(InputEvent inputEvent)
    {
        if (Input.IsActionJustPressed("Jump"))
        {
            jumpBufferTimer = Player.JumpBufferTime;

            if (coyoteTimer > 0)
            {
                GD.Print("--- Coyote ---");
                return PlayerStates.Jump;
            }
        }

        return PlayerStates.Null;
    }

    public override PlayerStates UpdatePhysics(double delta)
    {
        jumpBufferTimer -= delta;
        coyoteTimer -= delta;

        int direction = 0;
        if (Input.IsActionPressed("Left") && !Input.IsActionPressed("Right"))
        {
            PlayerSprites.Scale = new(1, 1);
            direction = -1;
        }
        if (Input.IsActionPressed("Right") && !Input.IsActionPressed("Left"))
        {
            PlayerSprites.Scale = new(-1, 1);
            direction = 1;
        }

        Player.Velocity = new(direction * Player.MoveSpeed, Player.Velocity.Y + (Player.Gravity * (float)delta));
        Player.MoveAndSlide();

        if (Player.IsOnFloor())
        {
            if (jumpBufferTimer > 0)
            {
                GD.Print("-- BufferedJump --");
                return PlayerStates.Jump;
            }

            if (direction != 0)
            {
                return PlayerStates.Walk;
            }
            else
            {
                return PlayerStates.Idle;
            }
        }

        return PlayerStates.Null;
    }
}
