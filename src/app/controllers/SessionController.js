import jwt from 'jsonwebtoken';
import User from '../models/User';
import authConfig from '../../config/auth';
import * as Yup from 'yup';

class SessionController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string()
        .email()
        .required(),
      password: Yup.string()
        .required()
        .min(6),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Preenchimento Invalido' });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: ' Usuario não existe' });
    }
    if (!(await user.checkPassword(password))) {
      return res.status(401).json({ error: 'Passoword incorreto.' });
    }
    const { id, name } = user;
    return res.json({
      user: {
        id,
        name,
        email,
      },
      token: jwt.sign({ id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      }),
    });
  }
}

export default new SessionController();
