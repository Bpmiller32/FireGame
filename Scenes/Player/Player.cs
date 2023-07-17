using Godot;

namespace FireGame;

public partial class Player : CharacterBody2D
{
    [Export]
    public int MoveSpeed { get; set; } = 500;
    [Export]
    public int Gravity { get; set; } = 4;
    [Export]
    public int JumpForce { get; set; } = 100;

    private PlayerStateManager stateMachine;

    public override void _Ready()
    {
        stateMachine = new(this);
    }

    public override void _UnhandledKeyInput(InputEvent inputEvent)
    {
        stateMachine.Input(inputEvent);
    }

    public override void _PhysicsProcess(double delta)
    {
        stateMachine.UpdatePhysics(delta);
    }
}
